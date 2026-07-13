"use client";

import type { LayoutSettings } from "@/lib/labelGrid";

export default function PrintPageStyle({ layout }: { layout: LayoutSettings }) {
  const widthMm = (layout.paperWidthCm * 10).toFixed(2);
  const heightMm = (layout.paperHeightCm * 10).toFixed(2);

  return (
    <style>{`@media print {
  @page {
    size: ${widthMm}mm ${heightMm}mm;
    margin: 0;
  }
  html,
  body {
    width: ${widthMm}mm;
  }
}`}</style>
  );
}
