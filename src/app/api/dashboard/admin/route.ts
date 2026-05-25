import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const tenantFilter = tenantId ? { tenantId } : {};

  const [
    totalDepartments, totalItems, totalAssets, totalUsers,
    pendingApprovals, recentTransactions, recentMovements,
    itemsByDept, assetsByDept, allItems,
  ] = await Promise.all([
    prisma.department.count({ where: { ...tenantFilter, status: "active" } }),
    prisma.inventoryItem.count({ where: { ...tenantFilter, status: { not: "Inactive" } } }),
    prisma.asset.count({ where: { ...tenantFilter, status: { not: "Discarded" } } }),
    prisma.user.count({ where: { ...tenantFilter, status: "active" } }),
    prisma.approval.count({ where: { ...tenantFilter, status: "Pending" } }),
    prisma.stockTransaction.findMany({
      where: { ...tenantFilter },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { item: { select: { itemName: true } }, department: { select: { departmentName: true } } },
    }),
    prisma.assetMovement.findMany({
      where: { ...tenantFilter },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { asset: { select: { assetName: true } } },
    }),
    prisma.department.findMany({
      where: { ...tenantFilter, status: "active" },
      include: { _count: { select: { inventoryItems: true } } },
      take: 8,
      orderBy: { departmentName: "asc" },
    }),
    prisma.department.findMany({
      where: { ...tenantFilter, status: "active" },
      include: { _count: { select: { assets: true } } },
      take: 8,
      orderBy: { departmentName: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { ...tenantFilter, status: { not: "Inactive" } },
      select: { currentStock: true, minimumStockLevel: true, condition: true, status: true },
    }),
  ]);

  const allAssets = await prisma.asset.findMany({
    where: { ...tenantFilter, status: { not: "Discarded" } },
    select: { condition: true, status: true },
  });

  const lowStockItems = allItems.filter((i) => i.currentStock <= i.minimumStockLevel).length;
  const damagedAssets = allAssets.filter((a) => a.condition === "Damaged").length;
  const underRepairAssets = allAssets.filter((a) => a.status === "Under Repair").length;

  return NextResponse.json({
    stats: { totalDepartments, totalItems, totalAssets, totalUsers, lowStockItems, damagedAssets, underRepairAssets, pendingApprovals },
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id, itemName: t.item.itemName, departmentName: t.department.departmentName,
      transactionType: t.transactionType, quantity: t.quantity, createdAt: t.createdAt,
    })),
    recentMovements: recentMovements.map((m) => ({
      id: m.id, assetName: m.asset.assetName, movementType: m.movementType, createdAt: m.createdAt,
    })),
    inventoryByDept: itemsByDept.map((d) => ({ name: d.departmentName, value: d._count.inventoryItems })),
    assetsByDept: assetsByDept.map((d) => ({ name: d.departmentName, value: d._count.assets })),
  });
}
