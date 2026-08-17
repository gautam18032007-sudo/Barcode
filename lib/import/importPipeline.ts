// Import pipeline — orchestrates the pure layers into finished products.
//
//   Workbook → records → header detection → row mapping → identity resolution
//   → barcode assignment (SKU authoritative, else reserve() from the sequence)
//   → ImportedProduct[]
//
// `buildProducts` is pure given a sequence, so the whole pipeline is unit
// testable without a real file. `parseWorkbook` isolates the SheetJS I/O.

import type { MasterLookupResult } from "../productBarcodeMaster";
import type { BarcodeSequence } from "./barcodeGenerator";
import { detectHeaders } from "./headerDetection";
import { resolveIdentities } from "./identityResolver";
import { mapRows } from "./rowMapper";

export type ImportedProduct = {
  name: string;
  /** Provided SKU or master barcode only. Generated codes live on `barcode`, not here, to avoid
   *  a redundant "ZZ… <name>" line on the label. */
  sku?: string;
  barcode: string;
  price?: number;
  brand?: string;
  copies: number;
  /** True when the barcode was auto-generated (no SKU in the sheet and no master match). */
  generated: boolean;
};

export type ImportResult = {
  products: ImportedProduct[];
  totalCopies: number;
  generatedCount: number;
  masterMatchedCount: number;
};

/** Pure: records + a barcode sequence + optional master lookup → finished products. */
export const buildProducts = (
  records: Record<string, unknown>[],
  sequence: BarcodeSequence,
  masterLookup?: (productName: string) => MasterLookupResult | undefined,
): ImportResult => {
  const headers = detectHeaders(records[0] ? Object.keys(records[0]) : []);
  const identities = resolveIdentities(mapRows(records, headers));

  let generatedCount = 0;
  let masterMatchedCount = 0;

  const products: ImportedProduct[] = identities.map((identity) => {
    const hasSku = Boolean(identity.sku);
    let barcode: string;
    let isGenerated = false;

    if (hasSku) {
      barcode = String(identity.sku);
    } else {
      const masterResult = masterLookup ? masterLookup(identity.name) : undefined;
      if (masterResult && masterResult.found && masterResult.barcode) {
        barcode = String(masterResult.barcode);
        masterMatchedCount += 1;
      } else {
        barcode = sequence.reserve();
        isGenerated = true;
        generatedCount += 1;
      }
    }

    return {
      name: identity.name,
      sku: identity.sku || (isGenerated ? undefined : barcode),
      barcode,
      price: identity.price,
      brand: identity.brand,
      copies: identity.copies,
      generated: isGenerated,
    };
  });

  return {
    products,
    totalCopies: products.reduce((sum, product) => sum + product.copies, 0),
    generatedCount,
    masterMatchedCount,
  };
};

/** Read an uploaded .xlsx/.xls/.csv file into raw sheet records using dynamic import. */
export const parseWorkbook = async (file: File): Promise<Record<string, unknown>[]> => {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
};
