import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "Pending";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    ...(status !== "all" ? { status } : {}),
  };

  const [approvals, total] = await Promise.all([
    prisma.approval.findMany({ where, skip, take: limit, orderBy: { requestedAt: "desc" } }),
    prisma.approval.count({ where }),
  ]);

  return NextResponse.json({ data: approvals, total, page, limit });
}
