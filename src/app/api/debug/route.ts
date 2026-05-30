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
  ] = await Promise.all([
    prisma.inventoryItem.count({ where: { tenantId: tid ?? undefined } }),
    prisma.inventoryItem.count(),
    prisma.asset.count({ where: { tenantId: tid ?? undefined } }),
    prisma.asset.count(),
    prisma.inventoryItem.findMany({ distinct: ["tenantId"], select: { tenantId: true } }),
    prisma.asset.findMany({ distinct: ["tenantId"], select: { tenantId: true } }),
    prisma.department.findMany({ distinct: ["tenantId"], select: { tenantId: true } }),
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
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
