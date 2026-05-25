import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");
  const condition = searchParams.get("condition");
  const status = searchParams.get("status");

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    ...(departmentId ? { departmentId: parseInt(departmentId) } : {}),
    ...(condition ? { condition } : {}),
    ...(status ? { status } : { status: { not: "Discarded" } }),
  };

  const assets = await prisma.asset.findMany({
    where,
    orderBy: [{ department: { departmentName: "asc" } }, { assetName: "asc" }],
    include: {
      department: { select: { departmentName: true } },
      currentLocation: { select: { campusName: true, buildingName: true, roomName: true } },
    },
  });

  const totalAssets = assets.length;
  const totalValue = assets.reduce((sum, a) => sum + Number(a.purchaseValue ?? 0), 0);
  const damagedCount = assets.filter((a) => a.condition === "Damaged").length;
  const underRepairCount = assets.filter((a) => a.status === "Under Repair").length;

  return NextResponse.json({
    data: assets.map((a) => ({
      ...a,
      departmentName: a.department.departmentName,
      locationPath: a.currentLocation
        ? [a.currentLocation.campusName, a.currentLocation.buildingName, a.currentLocation.roomName].filter(Boolean).join(" > ")
        : null,
    })),
    summary: { totalAssets, totalValue, damagedCount, underRepairCount },
  });
}
