import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, itemId } = await params;
  const auditId = parseInt(id);
  const rowId = parseInt(itemId);

  const audit = await prisma.audit.findFirst({
    where: { id: auditId, tenantId: session.user.tenantId ?? undefined },
  });
  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });

  await prisma.auditItem.delete({ where: { id: rowId } });

  const allItems = await prisma.auditItem.findMany({ where: { auditId } });
  const grouped = new Map<number, typeof allItems>();
  for (const item of allItems) {
    const arr = grouped.get(item.referenceId) ?? [];
    arr.push(item);
    grouped.set(item.referenceId, arr);
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

  return NextResponse.json({ ok: true });
}
