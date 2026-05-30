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
  referenceType?: string; referenceId?: number; referenceName?: string; referenceCode?: string;
  expectedQuantity?: number; physicalQuantity?: number;
  conditionFound?: string; damageStatus?: string; remarks?: string;
};

interface CounterRow {
  referenceType: string | null;
  referenceId: number;
  expectedQuantity: number;
  physicalQuantity: number;
  conditionFound: string | null;
  damageStatus: string | null;
}

// Group by typed identity (referenceType + referenceId) so inventory and asset
// ids that happen to collide are never merged into the same item.
function computeCounters(rows: CounterRow[]) {
  const grouped = new Map<string, CounterRow[]>();
  for (const r of rows) {
    const key = `${r.referenceType ?? "?"}:${r.referenceId}`;
    const arr = grouped.get(key) ?? [];
    arr.push(r);
    grouped.set(key, arr);
  }
  const groups = Array.from(grouped.values());
  return {
    totalItems: groups.length,
    shortageCount: groups.filter(rs => rs.reduce((s, r) => s + r.physicalQuantity, 0) < rs[0].expectedQuantity).length,
    excessCount: groups.filter(rs => rs.reduce((s, r) => s + r.physicalQuantity, 0) > rs[0].expectedQuantity).length,
    missingCount: groups.filter(rs => rs.some(r => r.conditionFound === "Missing" || r.damageStatus === "Missing")).length,
    damagedCount: groups.filter(rs => rs.some(r => r.damageStatus && r.damageStatus !== "None")).length,
  };
}

// Bulk replace: delete all existing audit items and recreate from the submitted rows.
// Delete, recreate, and counter update all run inside one transaction so the audit
// can never be left with rows and counters out of sync.
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
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: "rows array required" }, { status: 400 });
  }
  const rows = body.rows.filter(r => (r.physicalQuantity ?? null) !== null);

  const data = rows.map(r => ({
    auditId,
    referenceType: r.referenceType ?? null,
    referenceId: r.referenceId ?? 0,
    referenceName: r.referenceName ?? "",
    referenceCode: r.referenceCode ?? "",
    expectedQuantity: r.expectedQuantity ?? 0,
    physicalQuantity: r.physicalQuantity ?? 0,
    difference: (r.physicalQuantity ?? 0) - (r.expectedQuantity ?? 0),
    conditionFound: r.conditionFound ?? null,
    damageStatus: r.damageStatus && r.damageStatus !== "None" ? r.damageStatus : null,
    remarks: r.remarks || null,
  }));

  const counters = computeCounters(data);

  await prisma.$transaction([
    prisma.auditItem.deleteMany({ where: { auditId } }),
    prisma.auditItem.createMany({ data }),
    prisma.audit.update({ where: { id: auditId }, data: counters }),
  ]);

  const items = await prisma.auditItem.findMany({ where: { auditId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const auditId = parseInt(id);

  const body = await req.json() as RowInput;
  const item = await prisma.auditItem.create({
    data: {
      auditId,
      referenceType: body.referenceType ?? null,
      referenceId: body.referenceId ?? 0,
      referenceName: body.referenceName ?? "",
      referenceCode: body.referenceCode ?? "",
      expectedQuantity: body.expectedQuantity ?? 0,
      physicalQuantity: body.physicalQuantity ?? 0,
      difference: (body.physicalQuantity ?? 0) - (body.expectedQuantity ?? 0),
      conditionFound: body.conditionFound ?? null,
      damageStatus: body.damageStatus ?? null,
      remarks: body.remarks ?? null,
    },
  });

  const allItems = await prisma.auditItem.findMany({ where: { auditId } });
  await prisma.audit.update({ where: { id: auditId }, data: computeCounters(allItems) });
  return NextResponse.json(item, { status: 201 });
}
