"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEditorStore } from "@/lib/editorStore";
import { computeGrid } from "@/lib/labelGrid";
import {
  formatBarcode,
  highestZzNumber,
  loadPersistedHighest,
  resetPersistedHighest,
  savePersistedHighest,
  seedSequence,
} from "@/lib/import/barcodeGenerator";
import { buildProducts, parseWorkbook } from "@/lib/import/importPipeline";
import { createMasterLookupFromMap } from "@/lib/productBarcodeMaster";

const emptySubscribe = () => () => {};
function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export default function ExcelImport() {
  const importProducts = useEditorStore((state) => state.importProducts);
  const layout = useEditorStore((state) => state.layout);
  const products = useEditorStore((state) => state.products);
  const [busy, setBusy] = useState(false);
  // Re-derived whenever products change or after an import (bump).
  const [bump, setBump] = useState(0);
  const isHydrated = useIsHydrated();

  const nextNumber = useMemo(() => {
    void bump;
    const existingCodes = products.flatMap((product) => [product.barcode, product.sku]);
    const persisted = isHydrated ? loadPersistedHighest() : 0;
    return Math.max(persisted, highestZzNumber(existingCodes)) + 1;
  }, [products, bump, isHydrated]);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const records = await parseWorkbook(file);
      if (records.length === 0) {
        toast.error("The sheet looks empty. Expected a header row with at least a Name column.");
        return;
      }

      let masterLookup: ReturnType<typeof createMasterLookupFromMap> | undefined;
      try {
        const res = await fetch("/api/products/master");
        if (res.ok) {
          const data = (await res.json()) as { success?: boolean; map?: Record<string, string> };
          if (data.success && data.map) {
            masterLookup = createMasterLookupFromMap(data.map);
          }
        }
      } catch (err) {
        console.warn("Could not fetch master database:", err);
      }

      const existingCodes = products.flatMap((product) => [product.barcode, product.sku]);
      const sequence = seedSequence(existingCodes);
      const {
        products: items,
        totalCopies,
        generatedCount,
        masterMatchedCount,
      } = buildProducts(records, sequence, masterLookup);
      if (items.length === 0) {
        toast.error("No products found. Check that the sheet has a Name (or SKU) column.");
        return;
      }
      const grid = computeGrid(layout);
      importProducts(items, Math.max(1, grid.labelsPerPage));
      savePersistedHighest(sequence.last());
      setBump((value) => value + 1);

      const details: string[] = [];
      if (masterMatchedCount > 0) {
        details.push(`${masterMatchedCount} matched from master`);
      }
      if (generatedCount > 0) {
        details.push(`${generatedCount} generated`);
      }

      toast.success(
        `Imported ${items.length} product${items.length === 1 ? "" : "s"} → ${totalCopies} label${
          totalCopies === 1 ? "" : "s"
        }${details.length > 0 ? ` (${details.join(", ")})` : ""}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the file.");
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    resetPersistedHighest();
    setBump((value) => value + 1);
    toast.success("Barcode counter reset.");
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="p-3 pb-2 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Import from Excel
          </CardTitle>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono text-muted-foreground" suppressHydrationWarning>
            Next: {formatBarcode(nextNumber)}
          </Badge>
        </div>
        <CardDescription className="text-[11px] text-muted-foreground leading-tight">
          Upload a sheet with a <span className="font-medium text-foreground">Name</span> column (Qty, SKU, Price, Brand auto-detected).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
            event.target.value = "";
          }}
          className="block w-full text-[11px] text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:text-foreground file:px-2.5 file:py-1 file:text-[11px] file:font-medium disabled:opacity-60 cursor-pointer"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
          <span>
            Next generated: <span className="font-mono font-medium text-foreground" suppressHydrationWarning>{formatBarcode(nextNumber)}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            disabled={busy || nextNumber <= 1}
            onClick={onReset}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
