import { describe, expect, it } from "vitest";

import {
  computeBarcodeLayout,
  detectBarcodeFormat,
  validateBarcodeValue,
} from "@/lib/barcodeEngine";

describe("detectBarcodeFormat", () => {
  it("uses CODE128 for alphanumeric values (regression for KNITAHDBG88979570)", () => {
    expect(detectBarcodeFormat("KNITAHDBG88979570")).toBe("CODE128");
    expect(detectBarcodeFormat("AQ-1001")).toBe("CODE128");
    expect(detectBarcodeFormat("ZZ0000001")).toBe("CODE128");
  });

  it("only picks EAN/UPC when the WHOLE value is digits of the exact length", () => {
    expect(detectBarcodeFormat("1234567890128")).toBe("EAN13");
    expect(detectBarcodeFormat("123456789012")).toBe("UPC");
    expect(detectBarcodeFormat("12345670")).toBe("EAN8");
    // Digit counts that don't match EAN/UPC symbology (e.g. 14 digits, 20 digits, 5 digits) fall back to CODE128.
    expect(detectBarcodeFormat("12345678901234")).toBe("CODE128");
    expect(detectBarcodeFormat("12345")).toBe("CODE128");
    expect(detectBarcodeFormat("880000")).toBe("CODE128");
  });
});

describe("validateBarcodeValue", () => {
  it("strips ASCII control characters and whitespace", () => {
    expect(validateBarcodeValue("  SKU-1001\x07  ")).toBe("SKU-1001");
    expect(validateBarcodeValue("")).toBe("");
  });
});

describe("computeBarcodeLayout", () => {
  it("computes EXCELLENT quality score for standard short barcodes", () => {
    const layout = computeBarcodeLayout({ value: "ZZ0000001" });
    expect(layout.qualityScore).toBeGreaterThanOrEqual(90);
    expect(layout.rating).toBe("EXCELLENT");
    expect(layout.moduleWidthPx).toBe(2.0);
  });

  it("computes WARNING rating and diagnostic message for high density character strings", () => {
    const longBarcode = "SKU-2026-00000001234567890123456789012345";
    const layout = computeBarcodeLayout({ value: longBarcode });
    expect(layout.rating).toBe("WARNING");
    expect(layout.diagnosticMessage).toBeDefined();
  });
});
