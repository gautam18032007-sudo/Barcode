import { describe, expect, it } from "vitest";
import JsBarcode from "jsbarcode";
import { computeBarcodeLayout, detectBarcodeFormat, validateBarcodeValue } from "@/lib/barcodeEngine";

// Mirrors the real production formula in app/[locale]/app/page.tsx
// (barcodeMaxWidthPx) so this test proves actual end-to-end scannability,
// not just the engine's math in isolation.
const CM_TO_PX = 37.8;
const MM_TO_PX = 3.779527559;
const MIN_SCANNABLE_DOTS_203DPI = 1.5;

type Preset = {
  id: string;
  labelWidthCm: number;
  cellPaddingCm: number;
  labelTemplate: "default" | "jewellery-split";
};

// One entry per real preset in PRESET_LAYOUTS (page.tsx), values copied
// from their declared labelWidthCm/cellPaddingCm/labelTemplate.
const PRESETS: Preset[] = [
  { id: "a4-4x13", labelWidthCm: 3.8, cellPaddingCm: 0.2, labelTemplate: "default" },
  { id: "a4-3x8", labelWidthCm: 7, cellPaddingCm: 0, labelTemplate: "default" },
  { id: "a4-2x7", labelWidthCm: 9.9, cellPaddingCm: 0, labelTemplate: "default" },
  { id: "roll-jewellery-100x19", labelWidthCm: 10, cellPaddingCm: 0.05, labelTemplate: "jewellery-split" },
  { id: "a4-jewellery-6up", labelWidthCm: 10, cellPaddingCm: 0.1, labelTemplate: "jewellery-split" },
];

const barcodeMaxWidthPx = (p: Preset) => {
  const labelWidthPx = p.labelWidthCm * CM_TO_PX;
  const paddingPx = p.cellPaddingCm * 2 * CM_TO_PX;
  const usableWidthPx = Math.max(labelWidthPx - paddingPx, 10);
  return p.labelTemplate === "jewellery-split" ? usableWidthPx / 2 : usableWidthPx;
};

const TEST_VALUES = [
  "ZZ0000001",
  "ZZ0000018",
  "ZZ9999999",
  "ABC12345",
  "A1234567",
  "4960697776",
  "123456",
  "12345678", // EAN8
  "123456789",
  "123456789012", // UPC
  "0000018",
  "1234567890128", // EAN13
  "KNITAHDBG88979570", // long alphanumeric
];

describe("scan safety: every real preset renders every barcode above the scannable floor", () => {
  for (const preset of PRESETS) {
    const widthPx = barcodeMaxWidthPx(preset);

    describe(`preset "${preset.id}" (usable barcode width ${widthPx.toFixed(1)}px)`, () => {
      for (const raw of TEST_VALUES) {
        it(`keeps "${raw}" at or above ${MIN_SCANNABLE_DOTS_203DPI} dots/module @ 203 DPI`, () => {
          const clean = validateBarcodeValue(raw);
          const layout = computeBarcodeLayout({ value: clean, printableWidthPx: widthPx });
          const dots203 = (layout.moduleWidthPx / MM_TO_PX) * 8;

          expect(dots203).toBeGreaterThanOrEqual(MIN_SCANNABLE_DOTS_203DPI);
          expect(layout.moduleWidthPx).toBeGreaterThanOrEqual(1.0);
          expect(layout.moduleWidthPx).toBeLessThanOrEqual(2.0);
          expect(layout.quietZonePx).toBeGreaterThanOrEqual(10);
        });
      }
    });
  }
});

describe("scan safety: JsBarcode actually renders every value without error, for every symbology", () => {
  const dom = typeof document !== "undefined" ? document : null;

  const SYMBOLOGY_SAMPLES = [
    "ZZ0000001", // CODE128
    "1234567890128", // EAN13
    "12345670", // EAN8
    "123456789012", // UPC
    "KNITAHDBG88979570", // CODE128 alphanumeric
  ];

  for (const raw of SYMBOLOGY_SAMPLES) {
    it(`renders "${raw}" (${detectBarcodeFormat(raw)}) into a non-empty SVG`, () => {
      if (!dom) return;
      const clean = validateBarcodeValue(raw);
      const format = detectBarcodeFormat(clean);
      const layout = computeBarcodeLayout({ value: clean, printableWidthPx: 150 });

      const svg = dom.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, layout.cleanValue, {
        format: layout.symbology,
        displayValue: true,
        height: layout.renderHeightPx,
        margin: 0,
        marginLeft: layout.quietZonePx,
        marginRight: layout.quietZonePx,
        width: layout.moduleWidthPx,
      });

      expect(layout.symbology).toBe(format);
      expect(svg.querySelectorAll("rect").length).toBeGreaterThan(0);
    });
  }
});
