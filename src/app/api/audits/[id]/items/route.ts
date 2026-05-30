import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const items = await prisma.auditItem.findMany({
    where: { auditId: parseInt(id) },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const auditId = parseInt(id);

  const body = await req.json() as {
    referenceId?: number; referenceName?: string; referenceCode?: string;
    expectedQuantity?: number; physicalQuantity?: number;
    conditionFound?: string; damageStatus?: string; remarks?: string;
  };

  const diff = (body.physicalQuantity ?? 0) - (body.expectedQuantity ?? 0);
  const item = await prisma.auditItem.create({
    data: {
      auditId,
      referenceId: body.referenceId ?? 0,
      referenceName: body.referenceName ?? "",
      referenceCode: body.referenceCode ?? "",
      expectedQuantity: body.expectedQuantity ?? 0,
      physicalQuantity: body.physicalQuantity ?? 0,
      difference: diff,
      conditionFound: body.conditionFound ?? null,
      damageStatus: body.damageStatus ?? null,
      remarks: body.remarks ?? null,
    },
  });

  const allItems = await prisma.auditItem.findMany({ where: { auditId } });
  const grouped = new Map<number, typeof allItems>();
  for (const row of allItems) {
    const arr = grouped.get(row.referenceId) ?? [];
    arr.push(row);
    grouped.set(row.referenceId, arr);
  }
  const groups = Array.from(grouped.values());

  await prisma.audit.update({
    where: { id: auditId },
    data: {
      totalItems: groups.length,
      shortageCount: groups.filter(rows => {
        const phy = rows.reduce((s, r) => s + r.physicalQuantity, 0);
        return phy < rows[0].expectedQuantity;
      }).length,
      excessCount: groups.filter(rows => {
        const phy = rows.reduce((s, r) => s + r.physicalQuantity, 0);
        return phy > rows[0].expectedQuantity;
      }).length,
      damagedCount: groups.filter(rows =>
        rows.some(r => r.damageStatus && r.damageStatus !== "None")
      ).length,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
