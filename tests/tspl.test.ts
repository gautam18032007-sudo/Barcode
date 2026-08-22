import { describe, expect, it } from "vitest";

import { calculateTsplBarWidths, generateTSPL, generateTsplBatch } from "@/lib/tspl";

describe("generateTSPL", () => {
  const label = {
    barcode: "101860",
    name: "Thor Keychain",
    sku: "ZZ001",
    price: 1200,
    brand: "ZenZebra",
  };

  it("emits a 100x15mm label with correct header", () => {
    const tspl = generateTSPL(label);
    expect(tspl).toContain("SIZE 100 mm,15 mm");
    expect(tspl).toContain("GAP 2 mm,0");
    expect(tspl).toContain("CLS");
    expect(tspl).toMatch(/PRINT 1\r\n$/);
  });

  it("includes the barcode, product name ONLY (no SKU prefix), brand and rupee price", () => {
    const tspl = generateTSPL(label);
    expect(tspl).toContain('"101860"');
    expect(tspl).toContain('"Thor Keychain"');
    expect(tspl).not.toContain("ZZ001 Thor Keychain");
    expect(tspl).toContain("ZenZebra");
    expect(tspl).toContain("SP = Rs.1200");
  });

  it("renders ONLY visible Product Name for various products while preserving encoded barcode", () => {
    const testCases = [
      { sku: "ABC123", name: "Silver Ring", barcode: "890000001" },
      { sku: "A001", name: "Gold Ring", barcode: "890000002" },
      { sku: "A002", name: "Diamond Necklace", barcode: "890000003" },
      { sku: "A003", name: "Silver Bracelet", barcode: "890000004" },
    ];

    for (const tc of testCases) {
      const tspl = generateTSPL(tc);
      // Visible product name text line must contain exact Product Name
      expect(tspl).toContain(`"${tc.name}"`);
      // TSPL BARCODE command must encode exact barcode value
      expect(tspl).toContain(`"${tc.barcode}"`);
      // Must NOT contain concatenated SKU + Name or SKU only as name line
      expect(tspl).not.toContain(`${tc.sku} ${tc.name}`);
      expect(tspl).not.toContain(`"${tc.sku}"`);
    }
  });

  it("proves visible label text changes dynamically when product name changes without altering barcode encoding", () => {
    const prod1 = { sku: "A001", name: "Gold Ring", barcode: "111111111111" };
    const prod2 = { sku: "A001", name: "Platinum Ring", barcode: "111111111111" };

    const tspl1 = generateTSPL(prod1);
    const tspl2 = generateTSPL(prod2);

    // Visible text reflects dynamic Product Name
    expect(tspl1).toContain('"Gold Ring"');
    expect(tspl2).toContain('"Platinum Ring"');

    // Both encode exact same unchanged barcode
    expect(tspl1).toContain('"111111111111"');
    expect(tspl2).toContain('"111111111111"');
  });

  it("keeps all X coordinates inside the 55mm printable body (<=440 dots)", () => {
    const tspl = generateTSPL(label);
    const xs = [...tspl.matchAll(/^(?:TEXT|BARCODE) (\d+),/gm)].map((m) => Number(m[1]));
    expect(xs.length).toBeGreaterThan(0);
    for (const x of xs) {
      expect(x).toBeLessThan(440);
    }
  });

  it("omits the price line when no price is set", () => {
    const tspl = generateTSPL({ barcode: "123", name: "No Price" });
    expect(tspl).not.toContain("SP =");
  });

  it("drops non-ASCII and double quotes from text", () => {
    const tspl = generateTSPL({ barcode: "123", name: 'Ring "Gold" ₹', brand: "Zén" });
    expect(tspl).not.toContain("₹");
    expect(tspl).not.toMatch(/"Ring "Gold""/);
  });

  it("batches multiple labels into repeated commands", () => {
    const batch = generateTsplBatch([label, label]);
    expect((batch.match(/SIZE 100 mm,15 mm/g) ?? []).length).toBe(2);
    expect((batch.match(/PRINT 1/g) ?? []).length).toBe(2);
  });
});

describe("calculateTsplBarWidths", () => {
  it("uses 2-dot narrow width for short barcodes and reduces to 1-dot narrow width when calculated dot width exceeds available space", () => {
    expect(calculateTsplBarWidths("ZZ0000001", 300)).toEqual({ narrow: 2, wide: 4 });
    const longBarcode = "SKU-2026-0000000123456789";
    expect(calculateTsplBarWidths(longBarcode, 200)).toEqual({ narrow: 1, wide: 2 });
  });
});
