import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await getSession();
    session.user = {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };
    await session.save();

    await logActivity({
      user: session.user,
      actionType: "LOGIN",
      module: "Auth",
      description: `User ${user.username} logged in`,
    });

    return NextResponse.json({
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
