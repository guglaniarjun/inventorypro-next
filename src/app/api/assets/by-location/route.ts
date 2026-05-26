import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    status: { not: "Discarded" },
    ...(category ? { assetCategory: category } : {}),
  };

  const assets = await prisma.asset.findMany({
    where,
    include: {
      currentLocation: true,
      department: { select: { departmentName: true } },
    },
    orderBy: { assetName: "asc" },
  });

  // Group by location
  const locationMap = new Map<
    string,
    {
      locationPath: string;
      locationId: number | null;
      rows: Array<{
        category: string;
        totalQuantity: number;
        count: number;
        assetIds: number[];
        conditions: Record<string, number>;
      }>;
    }
  >();

  for (const asset of assets) {
    const locationKey = asset.currentLocationId
      ? String(asset.currentLocationId)
      : "__no_location__";
    const locationPath = asset.currentLocation
      ? [
          asset.currentLocation.campusName,
          asset.currentLocation.buildingName,
          asset.currentLocation.roomName,
        ]
          .filter(Boolean)
          .join(" > ")
      : "No Location Assigned";

    if (!locationMap.has(locationKey)) {
      locationMap.set(locationKey, {
        locationPath,
        locationId: asset.currentLocationId,
        rows: [],
      });
    }

    const loc = locationMap.get(locationKey)!;
    const existing = loc.rows.find(r => r.category === asset.assetCategory);
    if (existing) {
      existing.totalQuantity += asset.quantity;
      existing.count += 1;
      existing.assetIds.push(asset.id);
      existing.conditions[asset.condition] = (existing.conditions[asset.condition] ?? 0) + asset.quantity;
    } else {
      loc.rows.push({
        category: asset.assetCategory,
        totalQuantity: asset.quantity,
        count: 1,
        assetIds: [asset.id],
        conditions: { [asset.condition]: asset.quantity },
      });
    }
  }

  const result = Array.from(locationMap.values())
    .map(loc => ({
      locationPath: loc.locationPath,
      locationId: loc.locationId,
      rows: loc.rows.sort((a, b) => a.category.localeCompare(b.category)),
      totalAssets: loc.rows.reduce((s, r) => s + r.totalQuantity, 0),
    }))
    .sort((a, b) => a.locationPath.localeCompare(b.locationPath));

  return NextResponse.json(result);
}
