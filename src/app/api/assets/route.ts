import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const status = searchParams.get("status") ?? "";
  const departmentId = searchParams.get("departmentId");
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    status: status || { not: "Discarded" },
    ...(search ? { assetName: { contains: search, mode: "insensitive" as const } } : {}),
    ...(category ? { assetCategory: category } : {}),
    ...(condition ? { condition } : {}),
    ...(departmentId ? { departmentId: parseInt(departmentId) } : {}),
  };

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        department: { select: { departmentName: true } },
        currentLocation: { select: { campusName: true, buildingName: true, roomName: true } },
      },
    }),
    prisma.asset.count({ where }),
  ]);

  return NextResponse.json({
    data: assets.map((a) => ({
      ...a,
      departmentName: a.department.departmentName,
      locationPath: a.currentLocation
        ? [a.currentLocation.campusName, a.currentLocation.buildingName, a.currentLocation.roomName]
            .filter(Boolean)
            .join(" > ")
        : null,
    })),
    total,
    page,
    limit,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    assetName?: string; assetCode?: string; assetCategory?: string; departmentId?: number;
    currentLocationId?: number | null; assignedToPersonName?: string | null;
    quantity?: number; isBulkAsset?: boolean; purchaseDate?: string | null;
    purchaseValue?: number | null; vendorName?: string | null; invoiceNumber?: string | null;
    warrantyStartDate?: string | null; warrantyEndDate?: string | null; amcDetails?: string | null;
    condition?: string; status?: string; remarks?: string | null; assetPhoto?: string | null;
  };

  if (!body.assetName || !body.assetCategory || !body.departmentId) {
    return NextResponse.json({ error: "Name, category, and department required" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: {
      tenantId: session.user.tenantId!,
      assetName: body.assetName,
      assetCode: body.assetCode ?? `AST-${Date.now()}`,
      assetCategory: body.assetCategory,
      departmentId: body.departmentId,
      currentLocationId: body.currentLocationId ?? null,
      assignedToPersonName: body.assignedToPersonName ?? null,
      quantity: body.quantity ?? 1,
      isBulkAsset: body.isBulkAsset ?? false,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchaseValue: body.purchaseValue ?? null,
      vendorName: body.vendorName ?? null,
      invoiceNumber: body.invoiceNumber ?? null,
      warrantyStartDate: body.warrantyStartDate ? new Date(body.warrantyStartDate) : null,
      warrantyEndDate: body.warrantyEndDate ? new Date(body.warrantyEndDate) : null,
      amcDetails: body.amcDetails ?? null,
      condition: body.condition ?? "Good",
      status: body.status ?? "In Use",
      remarks: body.remarks ?? null,
      assetPhoto: body.assetPhoto ?? null,
      createdBy: session.user.id,
    },
  });

  await logActivity({
    user: session.user,
    actionType: "CREATE",
    module: "Assets",
    recordId: asset.id,
    description: `Created asset: ${asset.assetName}`,
  });

  return NextResponse.json(asset, { status: 201 });
}
