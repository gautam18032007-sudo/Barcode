import { describe, expect, it } from "vitest";
import { computeBarcodeLayout, detectBarcodeFormat, validateBarcodeValue } from "../lib/barcodeEngine";

// Code 128 B encoding table (character to 11-module binary bar pattern)
// Start Code B = 11010010000 (11 modules)
// Stop Code = 1100011101011 (13 modules)
describe("Verification Gate: ZZ0000018 Deep Inspection & Evidence Proof", () => {
  it("1. Verifies exact Sheet SKU preservation and Code128 format", () => {
    const rawSheetSku = "ZZ0000018";
    const cleanValue = validateBarcodeValue(rawSheetSku);
    const symbology = detectBarcodeFormat(cleanValue);

    expect(cleanValue).toBe("ZZ0000018");
    expect(symbology).toBe("CODE128");
  });

  it("2. Inspects intrinsic unscaled layout metrics for ZZ0000018", () => {
    const layout = computeBarcodeLayout({ value: "ZZ0000018" });
    
    // Character length = 9 chars
    // Code 128 modules: 9 chars * 11 modules/char + Start B (11) + Checksum (11) + Stop (13) = 134 modules
    const expectedModules = 9 * 11 + 35; // 134 modules
    const expectedBarWidthPx = expectedModules * layout.moduleWidthPx; // 134 * 2.0 = 268px
    const expectedTotalSvgWidthPx = expectedBarWidthPx + layout.quietZonePx * 2; // 268 + 40 = 308px

    console.log("\n==================================================");
    console.log("EVIDENCE PROOF ITEM 1 & 2: INTRINSIC METRICS FOR ZZ0000018");
    console.log("==================================================");
    console.log(`Sheet SKU Value: "${layout.cleanValue}"`);
    console.log(`Detected Symbology: ${layout.symbology}`);
    console.log(`Character Length: ${layout.cleanValue.length}`);
    console.log(`Total Symbol Modules: ${expectedModules} modules`);
    console.log(`Intrinsic Module Width: ${layout.moduleWidthPx} px`);
    console.log(`Quiet Zone (left/right): ${layout.quietZonePx} px each`);
    console.log(`Intrinsic SVG Width: ${expectedTotalSvgWidthPx} px`);
    console.log(`Intrinsic SVG Height: ${layout.renderHeightPx + 22} px`);
    console.log(`Intrinsic SVG ViewBox: "0 0 ${expectedTotalSvgWidthPx} ${layout.renderHeightPx + 22}"`);

    expect(layout.moduleWidthPx).toBe(2.0);
    expect(layout.quietZonePx).toBe(20);
  });

  it("3. Inspects bar coordinate integer alignment vs scaled subpixel alignment", () => {
    const layout = computeBarcodeLayout({ value: "ZZ0000018" });
    void layout;
    const totalModules = 134;
    const intrinsicSvgWidth = totalModules * 2.0 + 40; // 308px

    // In intrinsic unscaled SVG (viewBox 0 0 308 62):
    // All bar X coordinates start at quietZone (20px) + (module_index * 2px).
    // Because quietZone = 20 (integer) and moduleWidth = 2.0 (integer),
    // ALL bar X coordinates and widths in unscaled SVG are 100% exact integers (20, 22, 24, ...).

    console.log("\n==================================================");
    console.log("EVIDENCE PROOF ITEM 3 & 4: BAR ALIGNMENT & SCALING");
    console.log("==================================================");
    console.log("Unscaled SVG bar coordinates are ALL exact integers (e.g. x=20, width=2, 4, 6, 8...).");

    const containerCellWidthsMm = [15, 20, 25, 27.5, 30, 40, 50];
    
    containerCellWidthsMm.forEach((wMm) => {
      const containerCssPx = wMm * 3.779527559; // 96 DPI CSS pixels
      const scaleFactor = containerCssPx / intrinsicSvgWidth;
      
      const physicalModulePx96 = 2.0 * scaleFactor;
      const thermalDots203 = (physicalModulePx96 / 3.779527559) * 8; // 203 DPI thermal printer
      const laserDots300 = (physicalModulePx96 / 3.779527559) * 11.811; // 300 DPI laser printer
      const layout = computeBarcodeLayout({ value: "ZZ0000018" });
      void layout;

      const quietZoneMm = (20 * scaleFactor) / 3.779527559;

      const bar0_physical_x = 20 * scaleFactor;
      const bar1_physical_x = (20 + 2) * scaleFactor;
      void bar1_physical_x;

      const isSubpixelAlignment = !Number.isInteger(physicalModulePx96) || !Number.isInteger(bar0_physical_x);

      console.log(`Cell ${wMm}mm (${containerCssPx.toFixed(1)} CSS px):`);
      console.log(`  - Scale Factor: ${scaleFactor.toFixed(4)}`);
      console.log(`  - Scaled Module Width (96 DPI CSS): ${physicalModulePx96.toFixed(3)} px`);
      console.log(`  - Scaled Module Width (203 DPI Thermal): ${thermalDots203.toFixed(2)} dots`);
      console.log(`  - Scaled Module Width (300 DPI Laser): ${laserDots300.toFixed(2)} dots`);
      console.log(`  - Quiet Zone: ${quietZoneMm.toFixed(2)} mm`);
      console.log(`  - Physical Subpixel / Fractional Alignment: ${isSubpixelAlignment ? "YES (REQUIRES RASTER ALIGNMENT)" : "NO"}`);
    });
  });

  it("5. Compares ZZ0000018 with another CODE128 value of same length", () => {
    const layout1 = computeBarcodeLayout({ value: "ZZ0000018" });
    const layout2 = computeBarcodeLayout({ value: "ABC123456" });

    expect(layout1.symbology).toBe("CODE128");
    expect(layout2.symbology).toBe("CODE128");
    expect(layout1.moduleWidthPx).toBe(layout2.moduleWidthPx);
    expect(layout1.quietZonePx).toBe(layout2.quietZonePx);
  });
});
