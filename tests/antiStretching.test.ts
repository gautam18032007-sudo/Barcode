import { describe, expect, it } from "vitest";

import { computeBarcodeLayout } from "../lib/barcodeEngine";

describe("Anti-Stretching & Geometry Integrity Regression Suite", () => {
  it("verifies module width remains constant when requested height changes", () => {
    const layout1 = computeBarcodeLayout({ value: "00000018", requestedHeightMm: 5 });
    const layout2 = computeBarcodeLayout({ value: "00000018", requestedHeightMm: 25 });

    expect(layout1.moduleWidthMm).toBe(layout2.moduleWidthMm);
    expect(layout1.moduleWidthPx).toBe(layout2.moduleWidthPx);
  });

  it("verifies total width is derived from modules, not stretched to container", () => {
    const layout = computeBarcodeLayout({
      value: "00000018",
      printableWidthMm: 100, // Container is 100mm
    });

    // Barcode should NOT expand to fill the full 100mm container arbitrarily
    expect(layout.barcodeWidthMm).toBeLessThan(60);
    expect(layout.moduleWidthMm).toBeLessThanOrEqual(0.5);
  });

  it("verifies quiet zones are strictly preserved on both ends", () => {
    const layout = computeBarcodeLayout({ value: "00000018" });
    expect(layout.quietZoneMm).toBeGreaterThanOrEqual(2.5);
    expect(layout.quietZonePx).toBeGreaterThanOrEqual(9);
  });
});
