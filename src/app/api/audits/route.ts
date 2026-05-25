import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const status = searchParams.get("status") ?? "";
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    ...(status ? { status } : {}),
  };

  const [audits, total] = await Promise.all([
    prisma.audit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { department: { select: { departmentName: true } } },
    }),
    prisma.audit.count({ where }),
  ]);

  return NextResponse.json({
    data: audits.map((a) => ({ ...a, departmentName: a.department.departmentName })),
    total, page, limit,
  });
}

export async function POST(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    auditType?: string; departmentId?: number; auditTitle?: string; auditDate?: string; remarks?: string;
  };

  if (!body.departmentId || !body.auditTitle || !body.auditDate) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const audit = await prisma.audit.create({
    data: {
      tenantId: session.user.tenantId!,
      auditType: body.auditType ?? "inventory",
      departmentId: body.departmentId,
      auditTitle: body.auditTitle,
      auditDate: new Date(body.auditDate),
      auditorId: session.user.id,
      remarks: body.remarks ?? null,
    },
  });

  return NextResponse.json(audit, { status: 201 });
}
