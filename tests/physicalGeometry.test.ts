import { describe, expect, it } from "vitest";

import {
  calculateSymbolModules,
  computeBarcodeLayout,
} from "../lib/barcodeEngine";

describe("Physical Barcode Geometry Engine Contract", () => {
  const TEST_SKUS = [
    "00000000",
    "00000001",
    "00000018",
    "00000123",
    "00099999",
    "99999999",
    "ABC12345",
  ];

  describe("X-Dimension Primacy & Mathematical Total Width", () => {
    it("calculates barcode width strictly as (symbolModules * X-dimension) + (quietZone * 2)", () => {
      TEST_SKUS.forEach((sku) => {
        const layout = computeBarcodeLayout({
          value: sku,
          requestedXDimensionMm: 0.33,
        });

        const expectedModules = calculateSymbolModules(sku, layout.symbology);
        expect(layout.symbolModules).toBe(expectedModules);

        const expectedQuietZoneMm = Math.max(2.5, 0.33 * 10);
        expect(layout.quietZoneMm).toBeGreaterThanOrEqual(2.5);

        const expectedWidth = expectedModules * 0.33 + layout.quietZoneMm * 2;
        expect(layout.barcodeWidthMm).toBeCloseTo(expectedWidth, 1);
      });
    });

    it("ensures barcode height changes NEVER alter X-dimension or module width", () => {
      TEST_SKUS.forEach((sku) => {
        const layout1 = computeBarcodeLayout({
          value: sku,
          requestedXDimensionMm: 0.33,
          requestedHeightMm: 8,
        });

        const layout2 = computeBarcodeLayout({
          value: sku,
          requestedXDimensionMm: 0.33,
          requestedHeightMm: 20,
        });

        expect(layout1.moduleWidthMm).toBe(layout2.moduleWidthMm);
        expect(layout1.barcodeWidthMm).toBe(layout2.barcodeWidthMm);
        expect(layout1.quietZoneMm).toBe(layout2.quietZoneMm);
        expect(layout1.moduleWidthDots203).toBe(layout2.moduleWidthDots203);

        expect(layout1.barcodeHeightMm).toBeCloseTo(8, 0);
        expect(layout2.barcodeHeightMm).toBeCloseTo(20, 0);
      });
    });

    it("predictably scales physical barcode width when X-dimension is modified", () => {
      const sku = "00000018";
      const smallX = computeBarcodeLayout({ value: sku, requestedXDimensionMm: 0.25 });
      const largeX = computeBarcodeLayout({ value: sku, requestedXDimensionMm: 0.50 });

      expect(largeX.barcodeWidthMm).toBeGreaterThan(smallX.barcodeWidthMm);
      expect(largeX.moduleWidthDots203).toBeGreaterThan(smallX.moduleWidthDots203);
      expect(largeX.moduleWidthDots300).toBeGreaterThan(smallX.moduleWidthDots300);
    });
  });

  describe("3-Tier Unit Separation (mm / Dots / Preview CSS px)", () => {
    it("converts physical mm accurately to 203 DPI and 300 DPI thermal printer dots", () => {
      const layout = computeBarcodeLayout({
        value: "00000018",
        requestedXDimensionMm: 0.33,
      });

      // 203 DPI = 8 dots/mm -> 0.33 * 8 = 2.64 dots
      expect(layout.moduleWidthDots203).toBeCloseTo(2.64, 2);
      // 300 DPI = 11.81 dots/mm -> 0.33 * 11.81 = 3.90 dots
      expect(layout.moduleWidthDots300).toBeCloseTo(3.90, 2);
    });

    it("converts physical mm accurately to preview CSS pixels (1mm = 3.7795px)", () => {
      const layout = computeBarcodeLayout({
        value: "00000018",
        requestedXDimensionMm: 0.33,
        requestedHeightMm: 10,
      });

      expect(layout.moduleWidthPx).toBeCloseTo(0.33 * 3.7795, 1);
      expect(layout.renderHeightPx).toBeCloseTo(10 * 3.7795, 0);
    });
  });

  describe("Label Sizing Isolation (Large vs Small Label)", () => {
    it("does NOT stretch barcode automatically when placed on a larger label", () => {
      const smallLabel = computeBarcodeLayout({
        value: "00000018",
        printableWidthMm: 50,
        requestedXDimensionMm: 0.33,
      });

      const largeLabel = computeBarcodeLayout({
        value: "00000018",
        printableWidthMm: 100,
        requestedXDimensionMm: 0.33,
      });

      expect(smallLabel.moduleWidthMm).toBe(largeLabel.moduleWidthMm);
      expect(smallLabel.barcodeWidthMm).toBe(largeLabel.barcodeWidthMm);
    });

    it("flags warning/unsafe when barcode exceeds available label width", () => {
      const tight = computeBarcodeLayout({
        value: "SKU-2026-LONG-BARCODE-NUMBER-9999",
        printableWidthMm: 20, // too small
        requestedXDimensionMm: 0.33,
      });

      expect(tight.fitsInLabel).toBe(false);
      expect(tight.riskLevel).toBe("UNSAFE");
      expect(tight.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Print Risk Assessment Classification", () => {
    it("classifies X >= 0.33mm as LOW_RISK", () => {
      const result = computeBarcodeLayout({ value: "00000018", requestedXDimensionMm: 0.35 });
      expect(result.riskLevel).toBe("LOW_RISK");
      expect(result.riskTitle).toBe("✓ LOW PRINT RISK");
    });

    it("classifies X >= 0.25mm as GOOD", () => {
      const result = computeBarcodeLayout({ value: "00000018", requestedXDimensionMm: 0.28 });
      expect(result.riskLevel).toBe("GOOD");
      expect(result.riskTitle).toBe("✓ GOOD PRINT GEOMETRY");
    });

    it("classifies X between 0.18mm and 0.24mm as REVIEW_SETTINGS", () => {
      const result = computeBarcodeLayout({ value: "00000018", requestedXDimensionMm: 0.20 });
      expect(result.riskLevel).toBe("REVIEW_SETTINGS");
      expect(result.riskTitle).toBe("⚠ REVIEW PRINT SETTINGS");
    });

    it("classifies X < 0.18mm as UNSAFE", () => {
      const result = computeBarcodeLayout({ value: "00000018", requestedXDimensionMm: 0.15 });
      expect(result.riskLevel).toBe("UNSAFE");
      expect(result.riskTitle).toBe("✕ UNSAFE GEOMETRY");
    });
  });
});
