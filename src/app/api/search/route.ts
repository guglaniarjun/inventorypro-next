import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ items: [], assets: [], departments: [], locations: [] });

  const tenantId = session.user.tenantId ?? undefined;
  const searchFilter = { contains: q, mode: "insensitive" as const };

  const [items, assets, departments, locations] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { tenantId, status: { not: "Inactive" }, OR: [{ itemName: searchFilter }, { itemCode: searchFilter }] },
      take: 5, select: { id: true, itemName: true, itemCode: true, category: true, currentStock: true, unit: true },
    }),
    prisma.asset.findMany({
      where: { tenantId, status: { not: "Discarded" }, OR: [{ assetName: searchFilter }, { assetCode: searchFilter }] },
      take: 5, select: { id: true, assetName: true, assetCode: true, assetCategory: true, condition: true, status: true },
    }),
    prisma.department.findMany({
      where: { tenantId, status: "active", departmentName: searchFilter },
      take: 5, select: { id: true, departmentName: true, departmentCode: true },
    }),
    prisma.location.findMany({
      where: { tenantId, status: "active", OR: [{ campusName: searchFilter }, { roomName: searchFilter }] },
      take: 5, select: { id: true, campusName: true, buildingName: true, roomName: true },
    }),
  ]);

  return NextResponse.json({ items, assets, departments, locations });
}
