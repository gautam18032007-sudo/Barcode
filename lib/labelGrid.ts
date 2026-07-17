export type LayoutSettings = {
  paperWidthCm: number;
  paperHeightCm: number;
  /** Physical print page height for roll printers (e.g. 1.5cm per sticker).
   *  When set, @page uses this instead of paperHeightCm, and PrintArea
   *  renders one label per physical print page. */
  printPageHeightCm?: number;
  marginCm: number;
  labelWidthCm: number;
  labelHeightCm: number;
  gapXCm?: number;
  gapYCm?: number;
  barcodeHeightMm?: number;
  fontSizePt?: number;
  cellPaddingCm?: number;
  offsetXCm?: number;
  offsetYCm?: number;
  labelTemplate?: "default" | "jewellery-split";
  brandText?: string;
  /** Per-preset override for how many labels to group per editor page.
   *  When set, computeGrid() uses this instead of columns × rows.
   *  Keeps the system scalable across roll sizes (100×15→6, 100×20→5, etc.). */
  editorLabelsPerPage?: number;
};

export type GridMetrics = {
  usableWidthCm: number;
  usableHeightCm: number;
  columns: number;
  rows: number;
  labelsPerPage: number;
  cellWidthCm: number;
  cellHeightCm: number;
};

const clampNonNegative = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function computeGrid(layout: LayoutSettings): GridMetrics {
  const gapX = clampNonNegative(layout.gapXCm ?? 0);
  const gapY = clampNonNegative(layout.gapYCm ?? 0);
  const margin = clampNonNegative(layout.marginCm);
  const offsetX = clampNonNegative(layout.offsetXCm ?? 0);
  const offsetY = clampNonNegative(layout.offsetYCm ?? 0);

  const usableWidthCm = clampNonNegative(layout.paperWidthCm - margin * 2 - offsetX);
  const usableHeightCm = clampNonNegative(layout.paperHeightCm - margin * 2 - offsetY);

  const cellWidthCm = clampNonNegative(layout.labelWidthCm + gapX);
  const cellHeightCm = clampNonNegative(layout.labelHeightCm + gapY);

  const columns = cellWidthCm === 0 ? 0 : Math.floor(usableWidthCm / cellWidthCm);
  const rows = cellHeightCm === 0 ? 0 : Math.floor(usableHeightCm / cellHeightCm);

  // Use per-preset override when provided; otherwise compute from grid math.
  const override = layout.editorLabelsPerPage;
  const labelsPerPage =
    override != null && override > 0
      ? override
      : Math.max(0, columns * rows);

  return {
    usableWidthCm,
    usableHeightCm,
    columns,
    rows: labelsPerPage > 0 && columns > 0 ? Math.ceil(labelsPerPage / columns) : rows,
    labelsPerPage,
    cellWidthCm,
    cellHeightCm,
  };
}
