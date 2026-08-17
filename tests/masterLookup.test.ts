import { describe, expect, it } from "vitest";

import { createSequence } from "@/lib/import/barcodeGenerator";
import { buildProducts } from "@/lib/import/importPipeline";
import {
  loadProductBarcodeMaster,
  normalizeProductName,
} from "@/lib/productBarcodeMaster";

describe("Product Barcode Master Database", () => {
  it("loads actual product/barcode.xlsx master database with correct row counts", () => {
    const master = loadProductBarcodeMaster();
    const stats = master.getStats();

    expect(stats.totalEntries).toBeGreaterThan(1000);
    expect(stats.uniqueEntries).toBeGreaterThan(1000);
  });

  it("preserves barcode values strictly as strings, preserving leading zeros", () => {
    const master = loadProductBarcodeMaster();
    const result = master.lookup("Bubz Prebiotic Soda – Citrus 250ml");

    expect(result.found).toBe(true);
    expect(typeof result.barcode).toBe("string");
    expect(result.barcode).toBe("0762497793918");
    expect(result.barcode?.startsWith("0")).toBe(true);
  });

  it("performs case-insensitive and whitespace-normalized product matching", () => {
    const master = loadProductBarcodeMaster();

    const resultExact = master.lookup("7UP Can 300 ml");
    const resultLower = master.lookup("7up can 300 ml");
    const resultSpaces = master.lookup("   7UP   Can   300  ml   ");

    expect(resultExact.found).toBe(true);
    expect(resultExact.barcode).toBe("8902080001361");

    expect(resultLower.found).toBe(true);
    expect(resultLower.barcode).toBe("8902080001361");

    expect(resultSpaces.found).toBe(true);
    expect(resultSpaces.barcode).toBe("8902080001361");
  });

  it("returns found = false for non-existent products without inventing barcodes", () => {
    const master = loadProductBarcodeMaster();
    const result = master.lookup("Non-Existent-Random-Product-999");

    expect(result.found).toBe(false);
    expect(result.barcode).toBeUndefined();
  });

  it("normalizes product names cleanly", () => {
    expect(normalizeProductName("  HELLO   World  ")).toBe("hello world");
    expect(normalizeProductName("Product\tName\nExtra")).toBe("product name extra");
  });
});

describe("Import Pipeline with Master Database Lookup", () => {
  it("resolves barcode from master database when product name matches", () => {
    const master = loadProductBarcodeMaster();
    const sequence = createSequence(0);

    const records = [
      { Product: "7UP Can 300 ml", Quantity: 2 },
      { Product: "3D Lollipop", Quantity: 1 },
    ];

    const result = buildProducts(records, sequence, master.lookup);

    expect(result.products).toHaveLength(2);

    expect(result.products[0].name).toBe("7UP Can 300 ml");
    expect(result.products[0].barcode).toBe("8902080001361");
    expect(result.products[0].sku).toBe("8902080001361");
    expect(result.products[0].generated).toBe(false);
    expect(result.products[0].copies).toBe(2);

    expect(result.products[1].name).toBe("3D Lollipop");
    expect(result.products[1].barcode).toBe("784668692714");
    expect(result.products[1].sku).toBe("784668692714");
    expect(result.products[1].generated).toBe(false);
    expect(result.products[1].copies).toBe(1);

    expect(result.masterMatchedCount).toBe(2);
    expect(result.generatedCount).toBe(0);
    expect(result.totalCopies).toBe(3);
  });

  it("falls back to auto-sequence for unmatched products without breaking sequence", () => {
    const master = loadProductBarcodeMaster();
    const sequence = createSequence(100);

    const records = [
      { Product: "7UP Can 300 ml", Quantity: 1 },
      { Product: "Custom Unknown Item", Quantity: 1 },
    ];

    const result = buildProducts(records, sequence, master.lookup);

    expect(result.products).toHaveLength(2);

    // Matched product from master
    expect(result.products[0].name).toBe("7UP Can 300 ml");
    expect(result.products[0].barcode).toBe("8902080001361");
    expect(result.products[0].generated).toBe(false);

    // Fallback generated product
    expect(result.products[1].name).toBe("Custom Unknown Item");
    expect(result.products[1].barcode).toBe("ZZ0000101");
    expect(result.products[1].generated).toBe(true);

    expect(result.masterMatchedCount).toBe(1);
    expect(result.generatedCount).toBe(1);
  });

  it("prioritizes explicitly provided SKU in imported file over master lookup", () => {
    const master = loadProductBarcodeMaster();
    const sequence = createSequence(0);

    const records = [
      { Product: "7UP Can 300 ml", SKU: "EXPLICIT-SKU-999", Quantity: 1 },
    ];

    const result = buildProducts(records, sequence, master.lookup);

    expect(result.products[0].barcode).toBe("EXPLICIT-SKU-999");
    expect(result.products[0].sku).toBe("EXPLICIT-SKU-999");
    expect(result.products[0].generated).toBe(false);
  });
});
