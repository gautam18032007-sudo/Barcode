"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

import {
  computeBarcodeLayout,
  detectBarcodeFormat,
  validateBarcodeValue,
} from "@/lib/barcodeEngine";

export { detectBarcodeFormat, validateBarcodeValue };

/**
 * Re-exported wrapper for backward compatibility with existing tests.
 */
export const calculateDynamicModuleWidth = (value: string): number => {
  const layout = computeBarcodeLayout({ value });
  return layout.moduleWidthPx;
};

export default function BarcodeSvg({
  value,
  height,
  maxHeightPx,
  printableWidthPx,
  printableWidthMm,
  moduleWidthOverride,
  fontBoldness = "bold",
}: {
  value: string;
  height: number;
  maxHeightPx?: number;
  printableWidthPx?: number;
  printableWidthMm?: number;
  moduleWidthOverride?: number;
  fontBoldness?: "normal" | "bold" | "extra-bold";
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const cleanValue = validateBarcodeValue(value);
    if (!svg || !cleanValue) {
      if (svg) {
        svg.innerHTML = "";
      }
      return;
    }

    const layout = computeBarcodeLayout({
      value: cleanValue,
      printableWidthMm,
      printableWidthPx,
      requestedHeightPx: height,
      requestedXDimensionMm: moduleWidthOverride && moduleWidthOverride < 1.0 ? moduleWidthOverride : undefined,
    });

    const activeModuleWidth = moduleWidthOverride && moduleWidthOverride > 0
      ? (moduleWidthOverride >= 1.0 ? moduleWidthOverride : layout.moduleWidthPx)
      : layout.moduleWidthPx;

    const fontOpt = fontBoldness === "normal" ? "" : "bold";

    const render = (format: string) => {
      JsBarcode(svg, layout.cleanValue, {
        format,
        displayValue: true,
        height: layout.renderHeightPx,
        margin: 0,
        marginLeft: layout.quietZonePx,
        marginRight: layout.quietZonePx,
        marginTop: 2,
        marginBottom: 2,
        width: activeModuleWidth,
        // Bold, larger human-readable number so it reads clearly at small sizes.
        fontSize: 18,
        fontOptions: fontOpt,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 2,
        background: "transparent",
        lineColor: "#000000",
      });
      // Set viewBox and explicit pixel dimensions so the barcode renders at its exact physical size without horizontal distortion
      const generatedWidth = parseFloat(svg.getAttribute("width") ?? "");
      const generatedHeight = parseFloat(svg.getAttribute("height") ?? "");
      if (Number.isFinite(generatedWidth) && Number.isFinite(generatedHeight)) {
        svg.setAttribute("viewBox", `0 0 ${generatedWidth} ${generatedHeight}`);
        svg.setAttribute("width", String(generatedWidth));
        svg.setAttribute("height", String(generatedHeight));
      }
    };

    try {
      render(layout.symbology);
    } catch {
      // Fall back to CODE128 (accepts any ASCII) — e.g. a 13-digit value with
      // an invalid EAN checksum would otherwise render blank.
      try {
        render("CODE128");
      } catch {
        svg.innerHTML = "";
      }
    }
  }, [value, height, printableWidthPx, printableWidthMm, moduleWidthOverride, fontBoldness]);

  return (
    <svg
      ref={svgRef}
      className="shrink-0"
      style={{
        display: "block",
        maxWidth: "100%",
        maxHeight: maxHeightPx ? `${maxHeightPx}px` : undefined,
        objectFit: "contain",
      }}
    />
  );
}

