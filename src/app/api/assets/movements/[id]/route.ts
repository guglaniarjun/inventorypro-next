import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const movement = await prisma.assetMovement.findFirst({
    where: { id: parseInt(id), tenantId: session.user.tenantId ?? undefined },
    include: {
      asset: { select: { assetName: true, assetCode: true } },
      fromDepartment: { select: { departmentName: true } },
      toDepartment: { select: { departmentName: true } },
    },
  });
  if (!movement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(movement);
}
