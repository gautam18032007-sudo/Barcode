import { describe, expect, it } from "vitest";
import { computeBarcodeLayout, detectBarcodeFormat, validateBarcodeValue } from "../lib/barcodeEngine";

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

// Common printable label cell widths in mm in the system (e.g. 50mm label split in half = 25mm cell, or 27.5mm half of jewellery tag)
const LABEL_CELL_WIDTH_MM = 27.5; // standard 27.5mm printable cell width for jewellery/apparel labels

describe("Comprehensive Barcode Investigation & Physical Bottleneck Matrix", () => {
  it("computes physical metrics matrix for all 11 test SKUs", () => {
    console.log("\n==========================================================================================");
    console.log(`BARCODE MATRIX INVESTIGATION FOR 11 SKUs (Container Cell Width: ${LABEL_CELL_WIDTH_MM}mm)`);
    console.log("==========================================================================================\n");

    const matrixResults: Array<Record<string, unknown>> = [];

    TEST_SKUS.forEach((sku) => {
      const clean = validateBarcodeValue(sku);
      const symbology = detectBarcodeFormat(clean);
      const layout = computeBarcodeLayout({ value: clean });

      // Code 128 module estimation: len * 11 + 35 (start B, check, stop)
      // EAN-13: 95 modules, EAN-8: 67 modules, UPC-A: 95 modules
      let totalModules = 0;
      if (symbology === "CODE128") {
        totalModules = clean.length * 11 + 35;
      } else if (symbology === "EAN13" || symbology === "UPC") {
        totalModules = 95;
      } else if (symbology === "EAN8") {
        totalModules = 67;
      } else {
        totalModules = clean.length * 11 + 35;
      }

      // Intrinsic SVG dimensions in JsBarcode
      // SVG width = (totalModules * moduleWidthPx) + quietZonePx * 2
      const intrinsicBarWidthPx = totalModules * layout.moduleWidthPx;
      const intrinsicTotalSvgWidthPx = intrinsicBarWidthPx + layout.quietZonePx * 2;
      const intrinsicSvgHeightPx = layout.renderHeightPx + 22; // 40px bar height + 22px text height/margins

      // Container cell physical dimensions
      const containerCssPx = LABEL_CELL_WIDTH_MM * 3.779527559; // 103.94 CSS px at 96 DPI
      const scaleFactor = containerCssPx / intrinsicTotalSvgWidthPx;

      // Effective rendered metrics when scaled via CSS `w-full`
      const effectiveModuleCssPx = layout.moduleWidthPx * scaleFactor;
      const effectiveModuleDots203 = (effectiveModuleCssPx / 3.779527559) * 8; // 203 DPI dots/mm
      const effectiveModuleDots300 = (effectiveModuleCssPx / 3.779527559) * 11.811; // 300 DPI dots/mm
      const effectiveQuietZoneMm = (layout.quietZonePx * scaleFactor) / 3.779527559;

      // Standards check:
      // Code 128 minimum quiet zone = 10 modules or 2.54mm (0.1 inch)
      // Standard minimum module width for 1D optical scanner = 0.25mm (~0.95 CSS px or ~2 dots at 203 DPI)
      const meetsQuietZoneSpec = effectiveQuietZoneMm >= 2.54;
      const meetsModuleWidthSpec = effectiveModuleDots203 >= 1.5;

      const result = {
        sku,
        symbology,
        len: clean.length,
        totalModules,
        intrinsicModuleWidthPx: layout.moduleWidthPx,
        intrinsicQuietZonePx: layout.quietZonePx,
        intrinsicSvgWidthPx: intrinsicTotalSvgWidthPx,
        renderedCssWidthPx: containerCssPx.toFixed(1),
        scaleFactor: scaleFactor.toFixed(4),
        effectiveModuleCssPx: effectiveModuleCssPx.toFixed(3),
        effectiveModuleDots203: effectiveModuleDots203.toFixed(2),
        effectiveModuleDots300: effectiveModuleDots300.toFixed(2),
        effectiveQuietZoneMm: effectiveQuietZoneMm.toFixed(2),
        meetsQuietZoneSpec,
        meetsModuleWidthSpec,
      };

      matrixResults.push(result);

      console.log(`SKU: "${sku}" (${symbology})`);
      console.log(`  - Modules: ${totalModules} | Intrinsic Module: ${layout.moduleWidthPx}px | Intrinsic Quiet Zone: ${layout.quietZonePx}px`);
      console.log(`  - Intrinsic SVG Size: ${intrinsicTotalSvgWidthPx}px x ${intrinsicSvgHeightPx}px (viewBox 0 0 ${intrinsicTotalSvgWidthPx} ${intrinsicSvgHeightPx})`);
      console.log(`  - Container CSS Width: ${containerCssPx.toFixed(1)}px (${LABEL_CELL_WIDTH_MM}mm)`);
      console.log(`  - CSS Scale Factor: ${scaleFactor.toFixed(4)}`);
      console.log(`  - Effective Module Width @ 203 DPI: ${effectiveModuleDots203.toFixed(2)} dots (${effectiveModuleCssPx.toFixed(3)}px)`);
      console.log(`  - Effective Module Width @ 300 DPI: ${effectiveModuleDots300.toFixed(2)} dots`);
      console.log(`  - Effective Quiet Zone: ${effectiveQuietZoneMm.toFixed(2)} mm`);
      console.log(`  - Code 128 Quiet Zone Spec (>= 2.54mm Met? ${meetsQuietZoneSpec ? "YES" : "NO (DEFICIT)"}`);
      console.log(`  - Scanner Module Dot Spec (>= 1.5 dots Met? ${meetsModuleWidthSpec ? "YES" : "NO (SUB-DOT COMPRESSION)"}\n`);
    });

    expect(matrixResults.length).toBe(11);
  });
});
