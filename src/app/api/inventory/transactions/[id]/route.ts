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
  const tx = await prisma.stockTransaction.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    include: {
      item: { select: { itemName: true, itemCode: true, unit: true } },
      department: { select: { departmentName: true } },
      fromDepartment: { select: { departmentName: true } },
      toDepartment: { select: { departmentName: true } },
    },
  });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tx);
}
