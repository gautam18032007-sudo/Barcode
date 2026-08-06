import { NextResponse } from "next/server";

import { deleteSession } from "@/lib/sessionStore";

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/app_session=([^;]+)/);
  if (match?.[1]) {
    deleteSession(match[1]);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("app_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
