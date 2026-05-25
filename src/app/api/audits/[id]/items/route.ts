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
  const items = await prisma.auditItem.findMany({
    where: { auditId: parseInt(id) },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: Params) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as {
    referenceId?: number; referenceName?: string; referenceCode?: string;
    expectedQuantity?: number; physicalQuantity?: number; expectedLocation?: string;
    actualLocation?: string; conditionFound?: string; damageStatus?: string; remarks?: string;
  };

  const diff = (body.physicalQuantity ?? 0) - (body.expectedQuantity ?? 0);
  const item = await prisma.auditItem.create({
    data: {
      auditId: parseInt(id),
      referenceId: body.referenceId ?? 0,
      referenceName: body.referenceName ?? "",
      referenceCode: body.referenceCode ?? "",
      expectedQuantity: body.expectedQuantity ?? 0,
      physicalQuantity: body.physicalQuantity ?? 0,
      difference: diff,
      expectedLocation: body.expectedLocation ?? null,
      actualLocation: body.actualLocation ?? null,
      conditionFound: body.conditionFound ?? null,
      damageStatus: body.damageStatus ?? null,
      remarks: body.remarks ?? null,
    },
  });

  // Update audit counters
  const allItems = await prisma.auditItem.findMany({ where: { auditId: parseInt(id) } });
  await prisma.audit.update({
    where: { id: parseInt(id) },
    data: {
      totalItems: allItems.length,
      shortageCount: allItems.filter((i) => i.difference < 0).length,
      excessCount: allItems.filter((i) => i.difference > 0).length,
      damagedCount: allItems.filter((i) => i.damageStatus === "Damaged").length,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
