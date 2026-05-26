import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["tenant_super_admin", "admin", "platform_super_admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { status?: string; remarks?: string };

  if (!body.status || !["Approved", "Rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Status must be Approved or Rejected" }, { status: 400 });
  }

  const approval = await prisma.approval.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
  });
  if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  if (approval.status !== "Pending") {
    return NextResponse.json({ error: "Approval already processed" }, { status: 400 });
  }

  // ─── Execute the pending action on Approve ───────────────────────────────
  if (body.status === "Approved") {
    if (approval.module === "Inventory-Transaction") {
      const tx = await prisma.stockTransaction.findFirst({
        where: { id: approval.recordId },
        include: { item: true },
      });
      if (tx && tx.approvalStatus === "Pending" && tx.item) {
        const newStock = tx.item.currentStock + tx.quantity;
        await prisma.$transaction([
          prisma.inventoryItem.update({
            where: { id: tx.itemId },
            data: { currentStock: newStock },
          }),
          prisma.stockTransaction.update({
            where: { id: tx.id },
            data: { approvalStatus: "Approved", afterStock: newStock },
          }),
        ]);
        await logActivity({
          user: session.user,
          actionType: "TRANSACTION",
          module: "Inventory",
          recordId: tx.id,
          description: `Approved: ${tx.transactionType} — ${Math.abs(tx.quantity)} ${tx.item.unit} of ${tx.item.itemName}`,
        });
      }
    } else if (approval.module === "Asset-Movement") {
      const movement = await prisma.assetMovement.findFirst({
        where: { id: approval.recordId },
        include: { asset: true },
      });
      if (movement && movement.approvalStatus === "Pending" && movement.asset) {
        const asset = movement.asset;
        const qty = movement.quantity;

        if (movement.movementType === "Stock Addition") {
          await prisma.asset.update({
            where: { id: asset.id },
            data: { quantity: { increment: qty } },
          });
        } else if (movement.movementType === "Discard") {
          const newQty = Math.max(0, asset.quantity - qty);
          await prisma.asset.update({
            where: { id: asset.id },
            data: { quantity: newQty, ...(newQty <= 0 ? { status: "Discarded" } : {}) },
          });
        } else {
          const assetUpdate: Record<string, unknown> = {};
          if (movement.toDepartmentId) assetUpdate.departmentId = movement.toDepartmentId;
          if (movement.toLocationId) assetUpdate.currentLocationId = movement.toLocationId;
          if (movement.toPerson) assetUpdate.assignedToPersonName = movement.toPerson;
          if (Object.keys(assetUpdate).length > 0) {
            await prisma.asset.update({ where: { id: asset.id }, data: assetUpdate });
          }
        }

        await prisma.assetMovement.update({
          where: { id: movement.id },
          data: { approvalStatus: "Approved" },
        });

        await logActivity({
          user: session.user,
          actionType: "MOVEMENT",
          module: "Assets",
          recordId: movement.id,
          description: `Approved: ${movement.movementType} — ${asset.assetName}`,
        });
      }
    }
  } else {
    // Rejected — mark the linked record as rejected
    if (approval.module === "Inventory-Transaction") {
      await prisma.stockTransaction.updateMany({
        where: { id: approval.recordId },
        data: { approvalStatus: "Rejected" },
      });
    } else if (approval.module === "Asset-Movement") {
      await prisma.assetMovement.updateMany({
        where: { id: approval.recordId },
        data: { approvalStatus: "Rejected" },
      });
    }
  }

  // Update the approval record
  await prisma.approval.updateMany({
    where: { id: parseInt(id) },
    data: {
      status: body.status,
      processedBy: session.user.id,
      processedAt: new Date(),
      remarks: body.remarks ?? null,
    },
  });

  await logActivity({
    user: session.user,
    actionType: body.status.toUpperCase(),
    module: "Approvals",
    recordId: parseInt(id),
    description: `${body.status} approval #${id}: ${approval.description}`,
  });

  return NextResponse.json({ ok: true });
}
