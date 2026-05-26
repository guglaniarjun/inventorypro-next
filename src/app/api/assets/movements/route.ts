import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const assetId = searchParams.get("assetId");
  const movementType = searchParams.get("type");
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    ...(assetId ? { assetId: parseInt(assetId) } : {}),
    ...(movementType ? { movementType } : {}),
  };

  const [movements, total] = await Promise.all([
    prisma.assetMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        asset: { select: { assetName: true, assetCode: true } },
        fromDepartment: { select: { departmentName: true } },
        toDepartment: { select: { departmentName: true } },
      },
    }),
    prisma.assetMovement.count({ where }),
  ]);

  return NextResponse.json({
    data: movements.map((m) => ({
      ...m,
      assetName: m.asset.assetName,
      assetCode: m.asset.assetCode,
      fromDepartmentName: m.fromDepartment?.departmentName ?? null,
      toDepartmentName: m.toDepartment?.departmentName ?? null,
    })),
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    assetId?: number; movementType?: string; quantity?: number;
    fromDepartmentId?: number | null; toDepartmentId?: number | null;
    fromLocationId?: number | null; toLocationId?: number | null;
    fromPerson?: string | null; toPerson?: string | null;
    movementDate?: string; remarks?: string | null;
    newCondition?: string; newStatus?: string;
  };

  if (!body.assetId || !body.movementType || !body.movementDate) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const asset = await prisma.asset.findFirst({
    where: { id: body.assetId, tenantId: session.user.tenantId ?? undefined },
  });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const movement = await prisma.assetMovement.create({
    data: {
      tenantId: session.user.tenantId!,
      assetId: body.assetId,
      movementType: body.movementType,
      quantity: body.quantity ?? 1,
      fromDepartmentId: body.fromDepartmentId ?? null,
      toDepartmentId: body.toDepartmentId ?? null,
      fromLocationId: body.fromLocationId ?? null,
      toLocationId: body.toLocationId ?? null,
      fromPerson: body.fromPerson ?? null,
      toPerson: body.toPerson ?? null,
      movementDate: new Date(body.movementDate),
      movedBy: session.user.id,
      approvalStatus: "Not Required",
      remarks: body.remarks ?? null,
    },
  });

  // Update asset state based on movement type
  const assetUpdate: Record<string, unknown> = {};
  if (body.toDepartmentId) assetUpdate.departmentId = body.toDepartmentId;
  if (body.toLocationId) assetUpdate.currentLocationId = body.toLocationId;
  if (body.toPerson) assetUpdate.assignedToPersonName = body.toPerson;
  if (body.newCondition) assetUpdate.condition = body.newCondition;
  if (body.newStatus) assetUpdate.status = body.newStatus;

  if (Object.keys(assetUpdate).length > 0) {
    await prisma.asset.updateMany({
      where: { id: body.assetId },
      data: assetUpdate,
    });
  }

  await logActivity({
    user: session.user,
    actionType: "MOVEMENT",
    module: "Assets",
    recordId: movement.id,
    description: `${body.movementType}: ${asset.assetName}`,
  });

  return NextResponse.json(movement, { status: 201 });
}
