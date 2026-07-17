import { describe, expect, it } from "vitest";

import { computeGrid } from "@/lib/labelGrid";

describe("computeGrid", () => {
  it("calculates grid dimensions with defaults", () => {
    const grid = computeGrid({
      paperWidthCm: 21,
      paperHeightCm: 29.7,
      marginCm: 1,
      labelWidthCm: 3.8,
      labelHeightCm: 2.12,
    });

    expect(grid.usableWidthCm).toBeCloseTo(19);
    expect(grid.usableHeightCm).toBeCloseTo(27.7);
    expect(grid.columns).toBe(5);
    expect(grid.rows).toBe(13);
    expect(grid.labelsPerPage).toBe(65);
  });

  it("accounts for gaps in the label grid", () => {
    const grid = computeGrid({
      paperWidthCm: 21,
      paperHeightCm: 29.7,
      marginCm: 1,
      labelWidthCm: 3.83,
      labelHeightCm: 2,
      gapXCm: 0.2,
      gapYCm: 0.15,
    });

    expect(grid.cellWidthCm).toBeCloseTo(4.03);
    expect(grid.cellHeightCm).toBeCloseTo(2.15);
    expect(grid.columns).toBe(4);
    expect(grid.rows).toBe(12);
  });

  it("yields 6 labels per page for the jewellery roll preset with editorLabelsPerPage", () => {
    const grid = computeGrid({
      paperWidthCm: 10,
      paperHeightCm: 16,
      marginCm: 0,
      labelWidthCm: 10,
      labelHeightCm: 1.5,
      gapXCm: 0,
      gapYCm: 1.5,
      editorLabelsPerPage: 6,
    });

    expect(grid.columns).toBe(1);
    expect(grid.rows).toBe(6);
    expect(grid.labelsPerPage).toBe(6);
  });

  it("uses editorLabelsPerPage override instead of columns × rows", () => {
    const grid = computeGrid({
      paperWidthCm: 21,
      paperHeightCm: 29.7,
      marginCm: 1,
      labelWidthCm: 3.8,
      labelHeightCm: 2.12,
      editorLabelsPerPage: 10,
    });

    // Override takes precedence
    expect(grid.labelsPerPage).toBe(10);
    // Columns still computed from geometry
    expect(grid.columns).toBe(5);
    // Rows recomputed from override / columns
    expect(grid.rows).toBe(2);
  });

  it("ignores editorLabelsPerPage when zero or negative", () => {
    const grid = computeGrid({
      paperWidthCm: 21,
      paperHeightCm: 29.7,
      marginCm: 1,
      labelWidthCm: 3.8,
      labelHeightCm: 2.12,
      editorLabelsPerPage: 0,
    });

    // Falls back to normal grid math
    expect(grid.labelsPerPage).toBe(65);
  });

  it("clamps negative values to zero", () => {
    const grid = computeGrid({
      paperWidthCm: 21,
      paperHeightCm: 29.7,
      marginCm: -3,
      labelWidthCm: -4,
      labelHeightCm: -2,
      gapXCm: -1,
      gapYCm: -1,
    });

    expect(grid.columns).toBe(0);
    expect(grid.rows).toBe(0);
    expect(grid.labelsPerPage).toBe(0);
  });
});

