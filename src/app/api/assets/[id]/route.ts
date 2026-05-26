import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    include: {
      department: { select: { departmentName: true } },
      currentLocation: true,
      movements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          fromDepartment: { select: { departmentName: true } },
          toDepartment: { select: { departmentName: true } },
        },
      },
    },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...asset,
    departmentName: asset.department.departmentName,
    locationPath: asset.currentLocation
      ? [asset.currentLocation.campusName, asset.currentLocation.buildingName, asset.currentLocation.roomName]
          .filter(Boolean)
          .join(" > ")
      : null,
    movements: asset.movements.map((m) => ({
      ...m,
      fromDepartmentName: m.fromDepartment?.departmentName ?? null,
      toDepartmentName: m.toDepartment?.departmentName ?? null,
    })),
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  await prisma.asset.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: {
      assetName: body.assetName as string | undefined,
      assetCategory: body.assetCategory as string | undefined,
      departmentId: body.departmentId as number | undefined,
      currentLocationId: (body.currentLocationId as number | null) ?? null,
      assignedToPersonName: (body.assignedToPersonName as string | null) ?? null,
      condition: body.condition as string | undefined,
      status: body.status as string | undefined,
      vendorName: (body.vendorName as string | null) ?? null,
      invoiceNumber: (body.invoiceNumber as string | null) ?? null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate as string) : null,
      purchaseValue: (body.purchaseValue as number | null) ?? null,
      warrantyEndDate: body.warrantyEndDate ? new Date(body.warrantyEndDate as string) : null,
      amcDetails: (body.amcDetails as string | null) ?? null,
      remarks: (body.remarks as string | null) ?? null,
      assetPhoto: (body.assetPhoto as string | null) ?? undefined,
    },
  });

  await logActivity({
    user: session.user,
    actionType: "UPDATE",
    module: "Assets",
    recordId: parseInt(id),
    description: `Updated asset #${id}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.asset.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: { status: "Discarded" },
  });
  return NextResponse.json({ ok: true });
}
