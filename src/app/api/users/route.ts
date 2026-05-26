import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const role = searchParams.get("role");
  const status = searchParams.get("status") ?? "active";
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.role === "platform_super_admin" ? undefined : session.user.tenantId ?? undefined,
    ...(status !== "all" ? { status } : {}),
    ...(role ? { role } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fullName: "asc" },
      select: {
        id: true, username: true, fullName: true, email: true,
        role: true, departmentId: true, phone: true, status: true, lastLoginAt: true,
        department: { select: { departmentName: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ data: users, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["tenant_super_admin", "admin", "platform_super_admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    username?: string; fullName?: string; email?: string; password?: string;
    role?: string; departmentId?: number | null; phone?: string;
  };

  if (!body.username || !body.fullName || !body.email || !body.password) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username: body.username } });
  if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 409 });

  const passwordHash = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      tenantId: session.user.tenantId,
      username: body.username,
      fullName: body.fullName,
      email: body.email,
      passwordHash,
      role: body.role ?? "staff",
      departmentId: body.departmentId ?? null,
      phone: body.phone ?? null,
    },
  });

  return NextResponse.json({ id: user.id, username: user.username, fullName: user.fullName }, { status: 201 });
}
