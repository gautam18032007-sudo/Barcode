// Unified Physical Barcode Geometry Engine & Scanner Diagnostic System
// Single source of truth shared between SVG web preview (BarcodeSvg.tsx),
// browser print (@media print), and TSPL thermal printer drivers (tspl.ts).

export type BarcodeQualityRating = "EXCELLENT" | "GOOD" | "WARNING" | "UNSAFE";
export type BarcodeRiskLevel = "LOW_RISK" | "GOOD" | "REVIEW_SETTINGS" | "UNSAFE";

export type BarcodeLayoutOptions = {
  value: string;
  printableWidthMm?: number;
  printableWidthPx?: number;
  requestedHeightMm?: number;
  requestedHeightPx?: number;
  requestedXDimensionMm?: number;
  dpi?: number;
};

export type BarcodeLayoutResult = {
  cleanValue: string;
  symbology: string;
  isValid: boolean;
  
  // Physical dimensions (Source of Truth - mm)
  moduleWidthMm: number;
  quietZoneMm: number;
  barcodeWidthMm: number;
  barcodeHeightMm: number;
  symbolModules: number;
  fitsInLabel: boolean;

  // Printer-specific Dots (203 DPI / 300 DPI)
  moduleWidthDots203: number;
  moduleWidthDots300: number;
  quietZoneDots203: number;
  quietZoneDots300: number;
  tsplNarrowDots: number;
  tsplWideDots: number;

  // Preview CSS Pixels (1mm = 3.7795px)
  moduleWidthPx: number;
  quietZonePx: number;
  renderHeightPx: number;
  previewWidthPx: number;
  previewHeightPx: number;

  // Print Risk Assessment System
  qualityScore: number; // 0 - 100
  rating: BarcodeQualityRating;
  riskLevel: BarcodeRiskLevel;
  riskTitle: string;
  diagnosticMessage?: string;
  warnings: string[];
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
 * Calculate total symbol modules for a barcode string and symbology.
 * Code 128: 11 modules per char + 35 start/stop/checksum modules.
 */
export const calculateSymbolModules = (value: string, symbology: string): number => {
  const len = value.length;
  if (symbology === "EAN13" || symbology === "UPC") {
    return 95;
  }
  if (symbology === "EAN8") {
    return 67;
  }
  // CODE128 default
  return Math.max(35, len * 11 + 35);
};

/**
 * Calculate unified physical layout metrics, 3-tier unit conversions, and honest Print Risk Assessment.
 */
export const computeBarcodeLayout = (options: BarcodeLayoutOptions): BarcodeLayoutResult => {
  const cleanValue = validateBarcodeValue(options.value);
  const isValid = cleanValue.length > 0;
  const symbology = detectBarcodeFormat(cleanValue);
  const len = cleanValue.length;

  const symbolModules = calculateSymbolModules(cleanValue, symbology);
  const quietZoneModules = 10; // Standard 10 modules on each side (total 20)
  const totalModules = symbolModules + quietZoneModules * 2;

  const hasExplicitWidth = options.printableWidthMm != null || options.printableWidthPx != null;
  const printableWidthMm = options.printableWidthMm ?? (options.printableWidthPx ? options.printableWidthPx / 3.7795 : undefined);
  const targetWidthPx = options.printableWidthPx ?? (options.printableWidthMm ? options.printableWidthMm * 3.7795 : 300);
  const baseHeightPx = options.requestedHeightPx ?? (options.requestedHeightMm ? options.requestedHeightMm * 3.7795 : 40);

  // Calculate module width in CSS px first (for backward-compatible tests) and convert to mm
  let moduleWidthPx: number;
  if (options.requestedXDimensionMm && options.requestedXDimensionMm > 0) {
    moduleWidthPx = Math.round(options.requestedXDimensionMm * 3.7795 * 100) / 100;
  } else if (hasExplicitWidth) {
    const rawPx = targetWidthPx / totalModules;
    const maxModulePx = symbology === "CODE128" ? 2.0 : 1.5;
    moduleWidthPx = len <= 12
      ? Math.max(1.0, Math.min(maxModulePx, Math.round(rawPx * 100) / 100))
      : Math.max(1.0, Math.min(2.0, Math.round(rawPx * 100) / 100));
  } else {
    moduleWidthPx = symbology === "CODE128" ? 2.0 : 1.5;
  }

  const moduleWidthMm = Math.round((moduleWidthPx / 3.7795) * 100) / 100;
  const quietZonePx = Math.max(10, Math.round(moduleWidthPx * quietZoneModules));
  const quietZoneMm = Math.round((quietZonePx / 3.7795) * 100) / 100;

  const renderHeightPx = len > 20 ? Math.round(baseHeightPx * 1.15) : Math.round(baseHeightPx);
  const barcodeHeightMm = Math.round((renderHeightPx / 3.7795) * 100) / 100;

  // Total physical barcode dimensions (mm)
  const barcodeWidthMm = Math.round((symbolModules * moduleWidthMm + quietZoneMm * 2) * 100) / 100;
  const fitsInLabel = printableWidthMm == null || barcodeWidthMm <= printableWidthMm + 0.5;

  // Dot calculations for Thermal Printers (203 DPI = 8 dots/mm, 300 DPI = 11.81 dots/mm)
  const moduleWidthDots203 = Math.round(moduleWidthMm * 8 * 100) / 100;
  const moduleWidthDots300 = Math.round(moduleWidthMm * 11.81 * 100) / 100;
  const quietZoneDots203 = Math.round(quietZoneMm * 8);
  const quietZoneDots300 = Math.round(quietZoneMm * 11.81);

  // TSPL Command Dot Widths (Narrow / Wide dots)
  const tsplAvailableDots = (printableWidthMm ?? 27.5) * 8 - 16;
  const tsplRequiredDots = symbolModules * 2;
  const useThinDots = tsplRequiredDots > tsplAvailableDots;
  const tsplNarrowDots = useThinDots ? 1 : Math.max(1, Math.round(moduleWidthDots203));
  const tsplWideDots = tsplNarrowDots * 2;

  // Preview CSS Pixels (1mm = 3.7795px at 96 DPI CSS)
  const previewWidthPx = Math.round(barcodeWidthMm * 3.7795);
  const previewHeightPx = renderHeightPx;

  // Print Risk Assessment System & Warnings
  const warnings: string[] = [];

  if (!isValid) {
    warnings.push("Barcode string is empty or invalid.");
  }
  if (!fitsInLabel && printableWidthMm) {
    warnings.push(
      `Barcode width (${barcodeWidthMm.toFixed(1)}mm) exceeds available printable width (${printableWidthMm.toFixed(1)}mm). Reduce X-dimension or increase label width.`
    );
  }
  if (moduleWidthMm < 0.18) {
    warnings.push(
      `X-dimension (${moduleWidthMm.toFixed(2)}mm / ${moduleWidthDots203.toFixed(2)} dots @ 203 DPI) is below scanner-safe floor (0.18mm).`
    );
  } else if (moduleWidthMm < 0.25) {
    warnings.push(
      `X-dimension (${moduleWidthMm.toFixed(2)}mm / ${moduleWidthDots203.toFixed(2)} dots @ 203 DPI) is tight. Recommend 300+ DPI printer or larger label.`
    );
  }
  if (len > 35) {
    warnings.push(`High character density (${len} chars). Scanner resolution requirements are increased.`);
  }

  // Risk Rating Calculation
  let riskLevel: BarcodeRiskLevel = "LOW_RISK";
  let rating: BarcodeQualityRating = "EXCELLENT";
  let qualityScore = 100;

  if (!isValid || !fitsInLabel || moduleWidthMm < 0.18) {
    riskLevel = "UNSAFE";
    rating = "UNSAFE";
    qualityScore = moduleWidthMm < 0.18 ? 40 : 0;
  } else if (moduleWidthMm < 0.25 || len > 35) {
    riskLevel = "REVIEW_SETTINGS";
    rating = "WARNING";
    qualityScore = 65;
  } else if (moduleWidthMm < 0.33) {
    riskLevel = "GOOD";
    rating = "GOOD";
    qualityScore = 85;
  } else {
    riskLevel = "LOW_RISK";
    rating = "EXCELLENT";
    qualityScore = 100;
  }

  const riskTitleMap: Record<BarcodeRiskLevel, string> = {
    LOW_RISK: "✓ LOW PRINT RISK",
    GOOD: "✓ GOOD PRINT GEOMETRY",
    REVIEW_SETTINGS: "⚠ REVIEW PRINT SETTINGS",
    UNSAFE: "✕ UNSAFE GEOMETRY",
  };

  return {
    cleanValue,
    symbology,
    isValid,
    moduleWidthMm,
    quietZoneMm,
    barcodeWidthMm,
    barcodeHeightMm,
    symbolModules,
    fitsInLabel,
    moduleWidthDots203,
    moduleWidthDots300,
    quietZoneDots203,
    quietZoneDots300,
    tsplNarrowDots,
    tsplWideDots,
    moduleWidthPx,
    quietZonePx,
    renderHeightPx,
    previewWidthPx,
    previewHeightPx,
    qualityScore,
    rating,
    riskLevel,
    riskTitle: riskTitleMap[riskLevel],
    diagnosticMessage: warnings[0],
    warnings,
  };
};

