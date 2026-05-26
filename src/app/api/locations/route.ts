import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const locations = await prisma.location.findMany({
    where: {
      tenantId: session.user.tenantId ?? undefined,
      status: "active",
      ...(search ? { campusName: { contains: search, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ campusName: "asc" }, { buildingName: "asc" }],
  });

  const data = locations.map((l) => ({
    ...l,
    locationPath: [l.campusName, l.buildingName, l.floorName, l.roomName]
      .filter(Boolean)
      .join(" > "),
  }));

  return NextResponse.json({ data, total: data.length });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    campusName?: string; buildingName?: string; floorName?: string;
    roomName?: string; rackNo?: string; shelfNo?: string; binNo?: string; description?: string;
  };

  if (!body.campusName) return NextResponse.json({ error: "Campus name required" }, { status: 400 });

  const loc = await prisma.location.create({
    data: {
      tenantId: session.user.tenantId!,
      campusName: body.campusName,
      buildingName: body.buildingName ?? null,
      floorName: body.floorName ?? null,
      roomName: body.roomName ?? null,
      rackNo: body.rackNo ?? null,
      shelfNo: body.shelfNo ?? null,
      binNo: body.binNo ?? null,
      description: body.description ?? null,
    },
  });

  return NextResponse.json(loc, { status: 201 });
}
