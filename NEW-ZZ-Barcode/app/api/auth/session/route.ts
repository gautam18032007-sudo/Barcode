import { NextResponse } from "next/server";

import { getSession } from "@/lib/sessionStore";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/app_session=([^;]+)/);
  const sessionId = match?.[1];
  const session = getSession(sessionId);

  return NextResponse.json(
    { authenticated: Boolean(session) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
