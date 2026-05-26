import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: {
      id: parseInt(id),
      tenantId: session.user.role === "platform_super_admin" ? undefined : session.user.tenantId ?? undefined,
    },
    select: {
      id: true, username: true, fullName: true, email: true, role: true,
      departmentId: true, phone: true, status: true, lastLoginAt: true, createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as {
    fullName?: string; email?: string; role?: string;
    departmentId?: number | null; phone?: string; status?: string; password?: string;
  };

  const updateData: Record<string, unknown> = {
    fullName: body.fullName,
    email: body.email,
    role: body.role,
    departmentId: body.departmentId ?? null,
    phone: body.phone ?? null,
    status: body.status,
  };

  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 12);
  }

  await prisma.user.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: updateData,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.user.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: { status: "inactive" },
  });
  return NextResponse.json({ ok: true });
}
