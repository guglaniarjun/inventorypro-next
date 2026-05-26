import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: {
      tenantId: session.user.tenantId ?? undefined,
      status: { not: "Inactive" },
    },
    include: { department: { select: { departmentName: true } } },
    orderBy: { currentStock: "asc" },
  });

  // Filter in app layer since Prisma can't compare two columns in where clause
  const lowStockItems = items.filter((i) => i.currentStock <= i.minimumStockLevel);

  return NextResponse.json({
    data: lowStockItems.map((i) => ({
      ...i,
      departmentName: i.department.departmentName,
      isLowStock: true,
    })),
    total: lowStockItems.length,
    summary: {
      totalItems: lowStockItems.length,
      outOfStockCount: lowStockItems.filter((i) => i.currentStock === 0).length,
      lowStockCount: lowStockItems.filter((i) => i.currentStock > 0).length,
    },
  });
}
