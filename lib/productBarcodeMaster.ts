import path from "path";
import * as XLSX from "xlsx";

export type MasterLookupResult = {
  found: boolean;
  barcode?: string;
  matchedName?: string;
};

export type MasterDatabase = {
  lookup: (productName: string) => MasterLookupResult;
  getStats: () => { totalEntries: number; uniqueEntries: number; duplicatesCount: number };
  duplicates: Array<{ name: string; barcodes: string[] }>;
  getAllMap: () => Record<string, string>;
};

let cachedDatabase: MasterDatabase | null = null;

/** Normalize product name for matching: trim leading/trailing spaces, lowercase, collapse internal whitespace */
export const normalizeProductName = (name: string): string => {
  if (!name || typeof name !== "string") return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
};

/** Load and parse Product/Barcode.xlsx master database */
export const loadProductBarcodeMaster = (customFilePath?: string): MasterDatabase => {
  if (cachedDatabase && !customFilePath) {
    return cachedDatabase;
  }

  const filePath = customFilePath || path.join(process.cwd(), "Product", "Barcode.xlsx");

  let rawRows: (string | number | undefined)[][] = [];
  try {
    const workbook = XLSX.readFile(filePath, { raw: false, cellText: true, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (sheetName && workbook.Sheets[sheetName]) {
      rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        raw: false,
        defval: "",
      });
    }
  } catch (error) {
    console.warn(`[productBarcodeMaster] Could not read master Excel at ${filePath}:`, error);
  }

  const masterMap = new Map<string, { originalName: string; barcode: string }>();
  const duplicatesMap = new Map<string, Set<string>>();
  let totalEntries = 0;

  if (rawRows.length > 0) {
    const headerRow = (rawRows[0] || []).map((h) => String(h ?? "").trim());
    const prodIdx = headerRow.findIndex((h) => h.toLowerCase() === "product");
    const barIdx = headerRow.findIndex((h) => h.toLowerCase() === "barcode");

    const effectiveProdIdx = prodIdx !== -1 ? prodIdx : 0;
    const effectiveBarIdx = barIdx !== -1 ? barIdx : 1;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawProd = row[effectiveProdIdx] !== undefined ? String(row[effectiveProdIdx]).trim() : "";
      const rawBar = row[effectiveBarIdx] !== undefined ? String(row[effectiveBarIdx]).trim() : "";

      if (!rawProd || !rawBar) continue;
      totalEntries++;

      const normKey = normalizeProductName(rawProd);

      if (masterMap.has(normKey)) {
        const existing = masterMap.get(normKey)!;
        if (existing.barcode !== rawBar) {
          if (!duplicatesMap.has(normKey)) {
            duplicatesMap.set(normKey, new Set([existing.barcode]));
          }
          duplicatesMap.get(normKey)!.add(rawBar);
        }
      } else {
        masterMap.set(normKey, { originalName: rawProd, barcode: rawBar });
      }
    }
  }

  const duplicates: Array<{ name: string; barcodes: string[] }> = [];
  duplicatesMap.forEach((barcodes, key) => {
    duplicates.push({ name: key, barcodes: Array.from(barcodes) });
  });

  const database: MasterDatabase = {
    lookup: (productName: string): MasterLookupResult => {
      if (!productName || typeof productName !== "string") {
        return { found: false };
      }
      const normKey = normalizeProductName(productName);

      // If duplicate master product exists with conflicting barcodes, report/handle safely
      if (duplicatesMap.has(normKey)) {
        console.warn(
          `[productBarcodeMaster] Duplicate product name with conflicting barcodes in master: "${productName}"`,
        );
        return { found: false };
      }

      const match = masterMap.get(normKey);
      if (match) {
        return {
          found: true,
          barcode: String(match.barcode),
          matchedName: match.originalName,
        };
      }

      return { found: false };
    },
    getStats: () => ({
      totalEntries,
      uniqueEntries: masterMap.size,
      duplicatesCount: duplicates.length,
    }),
    duplicates,
    getAllMap: () => {
      const record: Record<string, string> = {};
      masterMap.forEach((val, key) => {
        if (!duplicatesMap.has(key)) {
          record[key] = val.barcode;
        }
      });
      return record;
    },
  };

  if (!customFilePath) {
    cachedDatabase = database;
  }

  return database;
};

/** Create a master lookup function from a Record dictionary */
export const createMasterLookupFromMap = (
  map: Record<string, string>,
): ((productName: string) => MasterLookupResult) => {
  return (productName: string): MasterLookupResult => {
    if (!productName || typeof productName !== "string") {
      return { found: false };
    }
    const normKey = normalizeProductName(productName);
    const barcode = map[normKey];
    if (barcode !== undefined && barcode !== null) {
      return {
        found: true,
        barcode: String(barcode),
        matchedName: productName.trim(),
      };
    }
    return { found: false };
  };
};
