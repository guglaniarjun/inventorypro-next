import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const module = searchParams.get("module") ?? "";
  const actionType = searchParams.get("actionType") ?? "";
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    ...(module ? { module } : {}),
    ...(actionType ? { actionType } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({ where, skip, take: limit, orderBy: { timestamp: "desc" } }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({ data: logs, total, page, limit });
}
