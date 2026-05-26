import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session.user) {
    await logActivity({
      user: session.user,
      actionType: "LOGOUT",
      module: "Auth",
      description: `User ${session.user.username} logged out`,
    });
  }

  session.destroy();
  return NextResponse.json({ ok: true });
}
