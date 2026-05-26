import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const deptId = parseInt(id);

  const [dept, totalItems, totalAssets, recentItems, deptItems] = await Promise.all([
    prisma.department.findFirst({ where: { id: deptId, tenantId: session.user.tenantId ?? undefined } }),
    prisma.inventoryItem.count({ where: { departmentId: deptId, status: { not: "Inactive" } } }),
    prisma.asset.count({ where: { departmentId: deptId, status: { not: "Discarded" } } }),
    prisma.inventoryItem.findMany({
      where: { departmentId: deptId, status: { not: "Inactive" } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, itemName: true, itemCode: true, currentStock: true, unit: true, status: true, minimumStockLevel: true },
    }),
    prisma.inventoryItem.findMany({
      where: { departmentId: deptId, status: { not: "Inactive" } },
      select: { currentStock: true, minimumStockLevel: true },
    }),
  ]);

  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lowStock = deptItems.filter((i) => i.currentStock <= i.minimumStockLevel).length;

  return NextResponse.json({
    department: dept,
    stats: { totalItems, totalAssets, lowStock },
    recentItems: recentItems.map((i) => ({ ...i, isLowStock: i.currentStock <= i.minimumStockLevel })),
  });
}
