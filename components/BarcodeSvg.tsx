"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

const detectBarcodeFormat = (value: string): string => {
  // If the value contains any non-digit characters, use CODE128
  // (CODE128 supports the full ASCII character set including letters)
  if (/\D/.test(value)) {
    return "CODE128";
  }
  if (value.length === 13) {
    return "EAN13";
  }
  if (value.length === 8) {
    return "EAN8";
  }
  if (value.length === 12) {
    return "UPC";
  }
  return "CODE128";
};

export default function BarcodeSvg({
  value,
  height,
  maxHeightPx,
}: {
  value: string;
  height: number;
  maxHeightPx?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) {
      return;
    }
    try {
      const format = detectBarcodeFormat(value);
      const svg = svgRef.current;

      // Check if value contains alphabetic characters
      const hasLetters = /[a-zA-Z]/.test(value);

      // For alphanumeric barcodes: bar width -1 (=1), SKU text +1.2 (=11.2)
      // For pure numeric barcodes: keep original width=2, fontSize=10
      let barWidth: number;
      let textSize: number;
      if (format === "EAN13" || format === "EAN8" || format === "UPC") {
        barWidth = 1.5;
        textSize = 10;
      } else if (hasLetters) {
        barWidth = 1;
        textSize = 11.2;
      } else {
        barWidth = 2;
        textSize = 10;
      }

      JsBarcode(svg, value, {
        format,
        displayValue: true,
        height,
        margin: 2,
        width: barWidth,
        fontSize: textSize,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 2,
        background: "transparent",
        lineColor: "#000000",
      });
      // JsBarcode sets fixed px width/height; swap them for a viewBox so the
      // barcode scales down to fit the cell while keeping its aspect ratio.
      const generatedWidth = parseFloat(svg.getAttribute("width") ?? "");
      const generatedHeight = parseFloat(svg.getAttribute("height") ?? "");
      if (Number.isFinite(generatedWidth) && Number.isFinite(generatedHeight)) {
        svg.setAttribute("viewBox", `0 0 ${generatedWidth} ${generatedHeight}`);
        svg.removeAttribute("width");
        svg.removeAttribute("height");
      }
    } catch {
      svgRef.current.innerHTML = "";
    }
  }, [value, height]);

  return (
    <svg
      ref={svgRef}
      className="h-auto w-full"
      style={{ maxWidth: "100%", maxHeight: maxHeightPx }}
    />
  );
}
