import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    include: {
      department: { select: { departmentName: true } },
      location: true,
    },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recentTransactions = await prisma.stockTransaction.findMany({
    where: { itemId: item.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      fromDepartment: { select: { departmentName: true } },
      toDepartment: { select: { departmentName: true } },
    },
  });

  return NextResponse.json({
    ...item,
    departmentName: item.department.departmentName,
    locationPath: item.location
      ? [item.location.campusName, item.location.buildingName, item.location.roomName].filter(Boolean).join(" > ")
      : null,
    isLowStock: item.currentStock <= item.minimumStockLevel,
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      fromDepartmentName: t.fromDepartment?.departmentName ?? null,
      toDepartmentName: t.toDepartment?.departmentName ?? null,
    })),
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  await prisma.inventoryItem.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: {
      itemName: body.itemName as string | undefined,
      itemCode: body.itemCode as string | undefined,
      category: body.category as string | undefined,
      itemType: body.itemType as string | undefined,
      description: (body.description as string | null) ?? null,
      usedFor: (body.usedFor as string | null) ?? null,
      unit: body.unit as string | undefined,
      minimumStockLevel: body.minimumStockLevel as number | undefined,
      reorderLevel: body.reorderLevel as number | undefined,
      locationId: (body.locationId as number | null) ?? null,
      rackNo: (body.rackNo as string | null) ?? null,
      shelfNo: (body.shelfNo as string | null) ?? null,
      remarks: (body.remarks as string | null) ?? null,
      itemPhoto: (body.itemPhoto as string | null) ?? undefined,
    },
  });

  await logActivity({
    user: session.user,
    actionType: "UPDATE",
    module: "Inventory",
    recordId: parseInt(id),
    description: `Updated inventory item #${id}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.inventoryItem.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: { status: "Inactive" },
  });
  return NextResponse.json({ ok: true });
}
