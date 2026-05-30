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

type RowInput = {
  referenceId?: number; referenceName?: string; referenceCode?: string;
  expectedQuantity?: number; physicalQuantity?: number;
  conditionFound?: string; damageStatus?: string; remarks?: string;
};

async function recomputeCounters(auditId: number) {
  const allItems = await prisma.auditItem.findMany({ where: { auditId } });
  // Group by referenceCode to avoid id collisions between inventory items and assets.
  const grouped = new Map<string, typeof allItems>();
  for (const row of allItems) {
    const key = row.referenceCode || `id:${row.referenceId}`;
    const arr = grouped.get(key) ?? [];
    arr.push(row);
    grouped.set(key, arr);
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
      missingCount: groups.filter(rows =>
        rows.some(r => r.conditionFound === "Missing" || r.damageStatus === "Missing")
      ).length,
      damagedCount: groups.filter(rows =>
        rows.some(r => r.damageStatus && r.damageStatus !== "None")
      ).length,
    },
  });
}

// Bulk replace: delete all existing audit items and recreate from the submitted rows.
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const auditId = parseInt(id);

  const audit = await prisma.audit.findFirst({
    where: { id: auditId, tenantId: session.user.tenantId ?? undefined },
    select: { id: true },
  });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { rows?: RowInput[] };
  const rows = (body.rows ?? []).filter(r => (r.physicalQuantity ?? null) !== null);

  await prisma.$transaction([
    prisma.auditItem.deleteMany({ where: { auditId } }),
    prisma.auditItem.createMany({
      data: rows.map(r => ({
        auditId,
        referenceId: r.referenceId ?? 0,
        referenceName: r.referenceName ?? "",
        referenceCode: r.referenceCode ?? "",
        expectedQuantity: r.expectedQuantity ?? 0,
        physicalQuantity: r.physicalQuantity ?? 0,
        difference: (r.physicalQuantity ?? 0) - (r.expectedQuantity ?? 0),
        conditionFound: r.conditionFound ?? null,
        damageStatus: r.damageStatus && r.damageStatus !== "None" ? r.damageStatus : null,
        remarks: r.remarks || null,
      })),
    }),
  ]);

  await recomputeCounters(auditId);
  const items = await prisma.auditItem.findMany({ where: { auditId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const auditId = parseInt(id);

  const body = await req.json() as RowInput;
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

  await recomputeCounters(auditId);
  return NextResponse.json(item, { status: 201 });
}
