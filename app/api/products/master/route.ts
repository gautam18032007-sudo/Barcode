import { NextResponse } from "next/server";

import { loadProductBarcodeMaster } from "@/lib/productBarcodeMaster";

export async function GET() {
  try {
    const master = loadProductBarcodeMaster();
    const map = master.getAllMap();
    const stats = master.getStats();

    return NextResponse.json({
      success: true,
      stats,
      map,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load master database";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
