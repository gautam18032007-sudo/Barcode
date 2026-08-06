// Unified Barcode Layout Engine & Scanner Diagnostic System
// Single source of truth shared between SVG web preview (BarcodeSvg.tsx)
// and TSPL thermal printer drivers (tspl.ts).

export type BarcodeQualityRating = "EXCELLENT" | "GOOD" | "WARNING" | "UNSAFE";

export type BarcodeLayoutOptions = {
  value: string;
  printableWidthPx?: number;
  printableWidthMm?: number;
  dpi?: number;
  requestedHeightPx?: number;
};

export type BarcodeLayoutResult = {
  cleanValue: string;
  symbology: string;
  isValid: boolean;
  moduleWidthPx: number;
  quietZonePx: number;
  renderHeightPx: number;
  tsplNarrowDots: number;
  tsplWideDots: number;
  qualityScore: number; // 0 - 100
  rating: BarcodeQualityRating;
  diagnosticMessage?: string;
};

/**
 * Validate raw barcode input string.
 * Strips ASCII control characters (0-31 and 127) and trims whitespace.
 */
export const validateBarcodeValue = (value: string): string => {
  if (!value) {
    return "";
  }
  return value.replace(/[\x00-\x1F\x7F]/g, "").trim();
};

/**
 * Detect barcode symbology. Default to CODE128 for compatibility with internal
 * SKUs, ERP numbers, and 14-digit codes unless explicitly EAN-13, EAN-8, or UPC-A.
 */
export const detectBarcodeFormat = (value: string): string => {
  const clean = validateBarcodeValue(value);
  if (!clean) {
    return "CODE128";
  }
  if (/^\d{13}$/.test(clean)) {
    return "EAN13";
  }
  if (/^\d{12}$/.test(clean)) {
    return "UPC";
  }
  if (/^\d{8}$/.test(clean)) {
    return "EAN8";
  }
  return "CODE128";
};

/**
 * Helper wrapper for backward compatibility with components and tests.
 */
export const calculateDynamicModuleWidth = (value: string): number => {
  const layout = computeBarcodeLayout({ value });
  return layout.moduleWidthPx;
};

/**
 * Calculate unified layout metrics, TSPL dot dimensions, and scanner Quality Score.
 */
export const computeBarcodeLayout = (options: BarcodeLayoutOptions): BarcodeLayoutResult => {
  const cleanValue = validateBarcodeValue(options.value);
  const isValid = cleanValue.length > 0;
  const symbology = detectBarcodeFormat(cleanValue);
  const len = cleanValue.length;

  const targetWidthPx = options.printableWidthPx ?? (options.printableWidthMm ? options.printableWidthMm * 3.78 : 300);
  const baseHeightPx = options.requestedHeightPx ?? 40;

  // Code128 symbol modules: 11 per char + 35 start/stop/checksum
  const estimatedModules = symbology === "CODE128" ? len * 11 + 35 : len * 10 + 20;
  // Dynamic scaling against target printable container width (with 20-module quiet zone buffer)
  const rawModuleWidth = targetWidthPx / (estimatedModules + 20);
  // Constrain module width between 1.0px (scanner-safe floor) and 2.0px
  const moduleWidthPx = len <= 12
    ? (symbology === "CODE128" ? 2.0 : 1.5)
    : Math.max(1.0, Math.min(2.0, Math.round(rawModuleWidth * 100) / 100));

  // Proportional quiet zone (minimum 10px / 10 modules)
  const quietZonePx = Math.max(10, Math.round(moduleWidthPx * 10));
  // Height scaling for dense barcodes (> 20 chars) to preserve aspect ratio
  const renderHeightPx = len > 20 ? Math.round(baseHeightPx * 1.15) : baseHeightPx;

  // TSPL thermal dot calculation (203 DPI = 8 dots/mm)
  const tsplAvailableDots = (options.printableWidthMm ?? 27.5) * 8 - 16;
  const tsplRequiredDots = estimatedModules * 2;
  const useThinDots = tsplRequiredDots > tsplAvailableDots;
  const tsplNarrowDots = useThinDots ? 1 : 2;
  const tsplWideDots = useThinDots ? 2 : 4;

  // Calculate Scanner Quality Score (0 - 100)
  let qualityScore = 100;
  if (moduleWidthPx < 1.2) {
    qualityScore -= 15;
  }
  if (moduleWidthPx <= 1.0) {
    qualityScore -= 15;
  }
  if (len > 30) {
    qualityScore -= 15;
  }
  if (len > 45) {
    qualityScore -= 20;
  }
  if (!isValid) {
    qualityScore = 0;
  }

  qualityScore = Math.max(0, Math.min(100, qualityScore));

  let rating: BarcodeQualityRating = "EXCELLENT";
  let diagnosticMessage: string | undefined;

  if (qualityScore >= 90) {
    rating = "EXCELLENT";
  } else if (qualityScore >= 75) {
    rating = "GOOD";
  } else if (qualityScore >= 55) {
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
};
