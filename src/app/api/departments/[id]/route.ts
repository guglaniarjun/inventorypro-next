import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dept = await prisma.department.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    include: {
      users: { where: { status: "active" }, select: { id: true, fullName: true, role: true, email: true } },
      _count: { select: { inventoryItems: true, assets: true } },
    },
  });

  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await prisma.inventoryItem.findMany({
    where: { departmentId: dept.id, status: { not: "Inactive" } },
    select: { id: true, itemName: true, itemCode: true, category: true, currentStock: true, unit: true, status: true },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });

  const assets = await prisma.asset.findMany({
    where: { departmentId: dept.id, status: { not: "Discarded" } },
    select: { id: true, assetName: true, assetCode: true, assetCategory: true, condition: true, status: true },
    take: 20,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    ...dept,
    itemCount: dept._count.inventoryItems,
    assetCount: dept._count.assets,
    recentItems: items,
    recentAssets: assets,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    departmentName?: string; departmentCode?: string;
    inchargeName?: string; location?: string; phone?: string; status?: string;
  };

  const dept = await prisma.department.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: {
      departmentName: body.departmentName,
      departmentCode: body.departmentCode,
      inchargeName: body.inchargeName ?? null,
      location: body.location ?? null,
      phone: body.phone ?? null,
      status: body.status ?? "active",
    },
  });

  if (!dept.count) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    user: session.user,
    actionType: "UPDATE",
    module: "Departments",
    recordId: parseInt(id),
    description: `Updated department #${id}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.department.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: { status: "inactive" },
  });

  return NextResponse.json({ ok: true });
}
