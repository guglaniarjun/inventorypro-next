import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, tenantId: true, username: true, fullName: true,
      email: true, role: true, departmentId: true, status: true,
      tenant: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, departmentName: true } },
    },
  });

  if (!user || user.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(user);
}
