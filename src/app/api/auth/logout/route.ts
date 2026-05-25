import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSessionData } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const session = await getIronSession<AppSessionData>(req, res, sessionOptions);

  if (session.user) {
    await logActivity({
      user: session.user,
      actionType: "LOGOUT",
      module: "Auth",
      description: `User ${session.user.username} logged out`,
    });
  }

  session.destroy();
  return res;
}
