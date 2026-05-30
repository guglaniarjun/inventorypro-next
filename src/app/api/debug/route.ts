import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tid = session.user.tenantId;

  const [
    itemsForSessionTenant,
    totalItemsAllTenants,
    assetsForSessionTenant,
    totalAssetsAllTenants,
    distinctItemTenants,
    distinctAssetTenants,
    distinctDeptTenants,
    orphanItemRows,
    orphanAssetRows,
  ] = await Promise.all([
    prisma.inventoryItem.count({ where: { tenantId: tid ?? undefined } }),
    prisma.inventoryItem.count(),
    prisma.asset.count({ where: { tenantId: tid ?? undefined } }),
    prisma.asset.count(),
    prisma.inventoryItem.findMany({ distinct: ["tenantId"], select: { tenantId: true } }),
    prisma.asset.findMany({ distinct: ["tenantId"], select: { tenantId: true } }),
    prisma.department.findMany({ distinct: ["tenantId"], select: { tenantId: true } }),
    prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*)::int AS c FROM inventory_items i LEFT JOIN departments d ON i.department_id = d.id WHERE d.id IS NULL`,
    prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*)::int AS c FROM assets a LEFT JOIN departments d ON a.department_id = d.id WHERE d.id IS NULL`,
  ]);

  return NextResponse.json(
    {
      sessionTenantId: tid,
      sessionRole: session.user.role,
      sessionUsername: session.user.username,
      itemsForSessionTenant,
      totalItemsAllTenants,
      assetsForSessionTenant,
      totalAssetsAllTenants,
      distinctItemTenantIds: distinctItemTenants.map((x) => x.tenantId),
      distinctAssetTenantIds: distinctAssetTenants.map((x) => x.tenantId),
      distinctDeptTenantIds: distinctDeptTenants.map((x) => x.tenantId),
      orphanedItems: orphanItemRows[0]?.c ?? 0,
      orphanedAssets: orphanAssetRows[0]?.c ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
