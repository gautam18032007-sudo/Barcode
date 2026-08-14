import { describe, expect, it } from "vitest";
import { computeBarcodeLayout, detectBarcodeFormat, validateBarcodeValue, type BarcodeLayoutOptions, type BarcodeLayoutResult } from "../lib/barcodeEngine";

const TEST_SKUS = [
  "ZZ0000001",
  "ZZ0000018",
  "ZZ0000019",
  "ZZ9999999",
  "ABC12345",
  "A1234567",
  "123456",
  "12345678",
  "123456789",
  "123456789012",
  "0000018",
];

const CELL_SIZES_MM = [20, 27.5, 100];

// Simulated computeBarcodeLayout for PROPOSED formula:
// const moduleWidthPx = len <= 12 ? 1.5 : Math.max(1.0, Math.min(2.0, Math.round(rawModuleWidth * 100) / 100));
function computeBarcodeLayoutProposed(options: BarcodeLayoutOptions): BarcodeLayoutResult {
  const cleanValue = validateBarcodeValue(options.value);
  const isValid = cleanValue.length > 0;
  const symbology = detectBarcodeFormat(cleanValue);
  const len = cleanValue.length;

  const targetWidthPx = options.printableWidthPx ?? (options.printableWidthMm ? options.printableWidthMm * 3.78 : 300);
  const baseHeightPx = options.requestedHeightPx ?? 40;

  const estimatedModules = symbology === "CODE128" ? len * 11 + 35 : len * 10 + 20;
  const rawModuleWidth = targetWidthPx / (estimatedModules + 20);

  // PROPOSED FORMULA:
  const moduleWidthPx = len <= 12
    ? 1.5
    : Math.max(1.0, Math.min(2.0, Math.round(rawModuleWidth * 100) / 100));

  const quietZonePx = Math.max(10, Math.round(moduleWidthPx * 10));
  const renderHeightPx = len > 20 ? Math.round(baseHeightPx * 1.15) : baseHeightPx;

  const tsplAvailableDots = (options.printableWidthMm ?? 27.5) * 8 - 16;
  const tsplRequiredDots = estimatedModules * 2;
  const useThinDots = tsplRequiredDots > tsplAvailableDots;
  const tsplNarrowDots = useThinDots ? 1 : 2;
  const tsplWideDots = useThinDots ? 2 : 4;

  let qualityScore = 100;
  if (moduleWidthPx < 1.2) qualityScore -= 15;
  if (moduleWidthPx <= 1.0) qualityScore -= 15;
  if (len > 30) qualityScore -= 15;
  if (len > 45) qualityScore -= 20;
  if (!isValid) qualityScore = 0;
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  let rating: "EXCELLENT" | "GOOD" | "WARNING" | "UNSAFE" = "EXCELLENT";
  let diagnosticMessage: string | undefined;

  if (qualityScore >= 90) rating = "EXCELLENT";
  else if (qualityScore >= 75) rating = "GOOD";
  else if (qualityScore >= 55) {
    rating = "WARNING";
    diagnosticMessage = `High character density (${len} chars). Scanner resolution may be reduced.`;
  } else {
    rating = "UNSAFE";
    diagnosticMessage = `Barcode length (${len} chars) exceeds optimal printable width. Recommended max: 35 chars.`;
  }

  return {
    cleanValue,
    symbology,
    isValid,
    moduleWidthPx,
    quietZonePx,
    renderHeightPx,
    tsplNarrowDots,
    tsplWideDots,
    qualityScore,
    rating,
    diagnosticMessage,
  };
}

describe("Approval Gate Simulation: Current vs Proposed", () => {
  it("simulates current vs proposed for all 11 SKUs across 20mm, 27.5mm, 100mm cells", () => {
    console.log("\n==========================================================================================");
    console.log("APPROVAL GATE SIMULATION: CURRENT VS PROPOSED CALCULATION");
    console.log("==========================================================================================\n");

    TEST_SKUS.forEach((sku) => {
      const clean = validateBarcodeValue(sku);
      const symbology = detectBarcodeFormat(clean);
      const current = computeBarcodeLayout({ value: clean });
      const proposed = computeBarcodeLayoutProposed({ value: clean });

      let totalModules = 0;
      if (symbology === "CODE128") totalModules = clean.length * 11 + 35;
      else if (symbology === "EAN13" || symbology === "UPC") totalModules = 95;
      else if (symbology === "EAN8") totalModules = 67;
      else totalModules = clean.length * 11 + 35;

      const currentSvgWidth = totalModules * current.moduleWidthPx + current.quietZonePx * 2;
      const proposedSvgWidth = totalModules * proposed.moduleWidthPx + proposed.quietZonePx * 2;

      console.log(`SKU: "${sku}" (${symbology})`);
      console.log(`  Module Width: Current = ${current.moduleWidthPx}px, Proposed = ${proposed.moduleWidthPx}px`);
      console.log(`  Quiet Zone: Current = ${current.quietZonePx}px, Proposed = ${proposed.quietZonePx}px`);
      console.log(`  Intrinsic SVG Size: Current = ${currentSvgWidth}x${current.renderHeightPx + 22}px, Proposed = ${proposedSvgWidth}x${proposed.renderHeightPx + 22}px`);

      CELL_SIZES_MM.forEach((cellMm) => {
        const cellPx = cellMm * 3.779527559; // 96 DPI CSS px
        const currentScale = cellPx / currentSvgWidth;
        const proposedScale = cellPx / proposedSvgWidth;

        const currentEffModuleCss = current.moduleWidthPx * currentScale;
        const proposedEffModuleCss = proposed.moduleWidthPx * proposedScale;

        const currentDots203 = (currentEffModuleCss / 3.779527559) * 8;
        const proposedDots203 = (proposedEffModuleCss / 3.779527559) * 8;

        const currentDots300 = (currentEffModuleCss / 3.779527559) * 11.811;
        const proposedDots300 = (proposedEffModuleCss / 3.779527559) * 11.811;

        const currentQuietMm = (current.quietZonePx * currentScale) / 3.779527559;
        const proposedQuietMm = (proposed.quietZonePx * proposedScale) / 3.779527559;

        const currentQuietOk = currentQuietMm >= 2.54;
        const proposedQuietOk = proposedQuietMm >= 2.54;

        console.log(`  Cell ${cellMm}mm:`);
        console.log(`    - Scale: Current = ${currentScale.toFixed(4)}, Proposed = ${proposedScale.toFixed(4)}`);
        console.log(`    - Eff Module @ 203 DPI: Current = ${currentDots203.toFixed(2)} dots, Proposed = ${proposedDots203.toFixed(2)} dots`);
        console.log(`    - Eff Module @ 300 DPI: Current = ${currentDots300.toFixed(2)} dots, Proposed = ${proposedDots300.toFixed(2)} dots`);
        console.log(`    - Quiet Zone (mm): Current = ${currentQuietMm.toFixed(2)}mm (${currentQuietOk ? "OK" : "DEFICIT"}), Proposed = ${proposedQuietMm.toFixed(2)}mm (${proposedQuietOk ? "OK" : "QUIET ZONE NOT RESTORED"})`);
      });
      console.log("");
    });

    expect(true).toBe(true);
  });
});
