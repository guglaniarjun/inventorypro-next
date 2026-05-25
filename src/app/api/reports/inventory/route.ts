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
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    ...(departmentId ? { departmentId: parseInt(departmentId) } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : { status: { not: "Inactive" } }),
  };

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: [{ department: { departmentName: "asc" } }, { itemName: "asc" }],
    include: {
      department: { select: { departmentName: true } },
      location: { select: { campusName: true, buildingName: true, roomName: true } },
    },
  });

  const totalItems = items.length;
  // App-layer filtering for cross-column comparison
  const lowStockCount = items.filter((i) => i.currentStock <= i.minimumStockLevel).length;
  const outOfStockCount = items.filter((i) => i.currentStock === 0).length;

  return NextResponse.json({
    data: items.map((i) => ({
      ...i,
      departmentName: i.department.departmentName,
      locationPath: i.location
        ? [i.location.campusName, i.location.buildingName, i.location.roomName].filter(Boolean).join(" > ")
        : null,
      isLowStock: i.currentStock <= i.minimumStockLevel,
    })),
    summary: { totalItems, lowStockCount, outOfStockCount },
  });
}
