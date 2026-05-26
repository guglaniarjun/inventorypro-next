import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["tenant_super_admin", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { status?: string; remarks?: string };

  if (!body.status || !["Approved", "Rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Status must be Approved or Rejected" }, { status: 400 });
  }

  await prisma.approval.updateMany({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    data: {
      status: body.status,
      processedBy: session.user.id,
      processedAt: new Date(),
      remarks: body.remarks ?? null,
    },
  });

  await logActivity({
    user: session.user,
    actionType: body.status.toUpperCase(),
    module: "Approvals",
    recordId: parseInt(id),
    description: `${body.status} approval request #${id}`,
  });

  return NextResponse.json({ ok: true });
}
