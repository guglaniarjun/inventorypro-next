import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.asset.findMany({
    where: { tenantId: session.user.tenantId ?? undefined, status: { not: "Discarded" } },
    select: { assetCategory: true },
    distinct: ["assetCategory"],
    orderBy: { assetCategory: "asc" },
  });

  return NextResponse.json(categories.map((c) => c.assetCategory));
}
