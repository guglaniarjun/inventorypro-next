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
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const itemType = searchParams.get("itemType") ?? "";
  const status = searchParams.get("status") ?? "";
  const departmentId = searchParams.get("departmentId");
  const skip = (page - 1) * limit;

  const tenantFilter = session.user.tenantId ? { tenantId: session.user.tenantId } : {};
  const deptFilter =
    session.user.role === "department_incharge" || session.user.role === "staff"
      ? { departmentId: session.user.departmentId ?? undefined }
      : departmentId
      ? { departmentId: parseInt(departmentId) }
      : {};

  const where = {
    ...tenantFilter,
    ...deptFilter,
    status: status ? status : { not: "Inactive" },
    ...(search ? { itemName: { contains: search, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
    ...(itemType ? { itemType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        department: { select: { departmentName: true } },
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return NextResponse.json({
    data: items.map((item) => ({
      ...item,
      departmentName: item.department.departmentName,
      isLowStock: item.currentStock <= item.minimumStockLevel,
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
    itemName?: string; itemCode?: string; category?: string; itemType?: string;
    description?: string; usedFor?: string; unit?: string; openingStock?: number;
    minimumStockLevel?: number; reorderLevel?: number; departmentId?: number;
    locationId?: number | null; rackNo?: string; shelfNo?: string; remarks?: string;
    itemPhoto?: string;
  };

  if (!body.itemName || !body.category || !body.departmentId) {
    return NextResponse.json({ error: "Name, category, and department required" }, { status: 400 });
  }

  const openingStock = body.openingStock ?? 0;

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId: session.user.tenantId!,
      departmentId: body.departmentId,
      itemName: body.itemName,
      itemCode: body.itemCode ?? `ITEM-${Date.now()}`,
      category: body.category,
      itemType: body.itemType ?? "Consumable",
      description: body.description ?? null,
      usedFor: body.usedFor ?? null,
      unit: body.unit ?? "Nos",
      openingStock,
      currentStock: openingStock,
      minimumStockLevel: body.minimumStockLevel ?? 0,
      reorderLevel: body.reorderLevel ?? 0,
      locationId: body.locationId ?? null,
      rackNo: body.rackNo ?? null,
      shelfNo: body.shelfNo ?? null,
      remarks: body.remarks ?? null,
      itemPhoto: body.itemPhoto ?? null,
      createdBy: session.user.id,
    },
  });

  await logActivity({
    user: session.user,
    actionType: "CREATE",
    module: "Inventory",
    recordId: item.id,
    description: `Created inventory item: ${item.itemName}`,
  });

  return NextResponse.json(item, { status: 201 });
}
