import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "platform_super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalTenants, activeTenants, totalUsers, totalItems, totalAssets, tenants] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "active" } }),
    prisma.inventoryItem.count({ where: { status: { not: "Inactive" } } }),
    prisma.asset.count({ where: { status: { not: "Discarded" } } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, departments: true } } },
    }),
  ]);

  return NextResponse.json({
    stats: { totalTenants, activeTenants, totalUsers, totalItems, totalAssets },
    tenants: tenants.map((t) => ({
      id: t.id, name: t.name, code: t.code, status: t.status,
      subscriptionPlan: t.subscriptionPlan, createdAt: t.createdAt,
      userCount: t._count.users, departmentCount: t._count.departments,
    })),
  });
}
