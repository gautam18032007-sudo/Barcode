import { NextResponse } from "next/server";

import { login } from "@/lib/odooClient";
import { createSession } from "@/lib/sessionStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const secret = body?.password ?? body?.apiKey;
  if (!body?.odooUrl || !body?.db || !body?.username || !secret) {
    return NextResponse.json(
      { error: "Missing credentials", errorCode: "missing_credentials" },
      { status: 400 },
    );
  }

  try {
    const uid =
      process.env.ODOO_MOCK === "true"
        ? 1
        : await login(body.odooUrl, body.db, body.username, secret);

    if (!uid) {
      return NextResponse.json(
        { error: "Invalid credentials", errorCode: "invalid_credentials" },
        { status: 401 },
      );
    }

    const sessionId = createSession({
      odooUrl: body.odooUrl,
      db: body.db,
      uid,
      apiKey: secret,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("app_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message, errorCode: "login_failed" }, { status: 401 });
  }
}
