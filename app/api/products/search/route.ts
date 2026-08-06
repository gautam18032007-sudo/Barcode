import { NextResponse } from "next/server";

import { searchProducts, type SearchProduct } from "@/lib/odooClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { getCached, setCached } from "@/lib/searchCache";
import { getSession } from "@/lib/sessionStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json([]);
  }

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/app_session=([^;]+)/);
  const sessionId = match?.[1];
  const session = getSession(sessionId);

  const rateKey = sessionId ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  if (!checkRateLimit(`search:${rateKey}`, 60, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded", errorCode: "rate_limited" },
      { status: 429 },
    );
  }

  if (!session && process.env.ODOO_MOCK !== "true") {
    return NextResponse.json({ error: "Unauthorized", errorCode: "unauthorized" }, { status: 401 });
  }

  if (process.env.ODOO_MOCK === "true") {
    return NextResponse.json([
      {
        id: 1,
        display_name: `Sample Product (${query})`,
        barcode: "1234567890123",
        default_code: "SAMPLE-001",
      },
    ]);
  }

  try {
    const cacheKey = `search:${session?.odoo.db}:${query}`;
    const cached = getCached<SearchProduct[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
    const results = await searchProducts(session!.odoo, query);
    setCached(cacheKey, results, 45_000);
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message, errorCode: "search_failed" }, { status: 500 });
  }
}
