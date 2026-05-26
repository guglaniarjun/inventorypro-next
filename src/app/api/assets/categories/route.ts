import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.asset.findMany({
    where: { tenantId: session.user.tenantId ?? undefined, status: { not: "Discarded" } },
    select: { assetCategory: true },
    distinct: ["assetCategory"],
    orderBy: { assetCategory: "asc" },
  });

  return NextResponse.json(categories.map((c) => c.assetCategory));
}
