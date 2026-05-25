import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "100");
  const search = searchParams.get("search") ?? "";
  const skip = (page - 1) * limit;

  const where = {
    tenantId: session.user.tenantId ?? undefined,
    status: "active",
    ...(search ? { departmentName: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip,
      take: limit,
      orderBy: { departmentName: "asc" },
      include: {
        _count: { select: { inventoryItems: true, assets: true, users: true } },
      },
    }),
    prisma.department.count({ where }),
  ]);

  return NextResponse.json({
    data: departments.map((d) => ({
      id: d.id,
      departmentName: d.departmentName,
      departmentCode: d.departmentCode,
      inchargeName: d.inchargeName,
      location: d.location,
      phone: d.phone,
      status: d.status,
      itemCount: d._count.inventoryItems,
      assetCount: d._count.assets,
      userCount: d._count.users,
    })),
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["tenant_super_admin", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;
  const { departmentName, departmentCode, inchargeName, location, phone } = body as {
    departmentName?: string; departmentCode?: string; inchargeName?: string;
    location?: string; phone?: string;
  };

  if (!departmentName || !departmentCode) {
    return NextResponse.json({ error: "Name and code required" }, { status: 400 });
  }

  const dept = await prisma.department.create({
    data: {
      tenantId: session.user.tenantId!,
      departmentName,
      departmentCode,
      inchargeName: inchargeName ?? null,
      location: location ?? null,
      phone: phone ?? null,
    },
  });

  await logActivity({
    user: session.user,
    actionType: "CREATE",
    module: "Departments",
    recordId: dept.id,
    description: `Created department: ${departmentName}`,
  });

  return NextResponse.json(dept, { status: 201 });
}
