import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const audit = await prisma.audit.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    include: {
      department: { select: { departmentName: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...audit, departmentName: audit.department.departmentName });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { status?: string; remarks?: string };

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.remarks !== undefined) data.remarks = body.remarks;
  if (body.status === "Completed") data.completedAt = new Date();

  await prisma.audit.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data,
  });
  return NextResponse.json({ ok: true });
}
