import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "platform_super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, departments: true } } },
  });

  return NextResponse.json({ data: tenants, total: tenants.length });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "platform_super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name?: string; code?: string; address?: string; contactPerson?: string; phone?: string; email?: string;
  };

  if (!body.name || !body.code) return NextResponse.json({ error: "Name and code required" }, { status: 400 });

  const tenant = await prisma.tenant.create({
    data: {
      name: body.name, code: body.code,
      address: body.address ?? null, contactPerson: body.contactPerson ?? null,
      phone: body.phone ?? null, email: body.email ?? null,
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
