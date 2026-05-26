import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const loc = await prisma.location.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
  });
  if (!loc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(loc);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as Record<string, string | null>;
  await prisma.location.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: body,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.location.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: { status: "inactive" },
  });
  return NextResponse.json({ ok: true });
}
