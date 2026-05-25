import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export interface SessionUser {
  id: number;
  tenantId: number | null;
  username: string;
  fullName: string;
  email: string;
  role: string;
  departmentId: number | null;
}

export interface AppSessionData {
  user?: SessionUser;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "inventorypro-fallback-secret-32chars!!",
  cookieName: "inventorypro_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<AppSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<AppSessionData>(cookieStore, sessionOptions);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<IronSession<AppSessionData>> {
  const res = new NextResponse();
  return getIronSession<AppSessionData>(req, res, sessionOptions);
}

export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const session = await getSessionFromRequest(req);
  if (!session.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
