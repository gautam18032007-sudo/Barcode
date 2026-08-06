import { describe, expect, it, beforeEach } from "vitest";

import { useEditorStore } from "@/lib/editorStore";

const resetStore = () => {
  useEditorStore.setState({
    pagesToRender: 1,
    pages: [],
    products: [],
    selectedCellIds: [],
    activeProductId: null,
    lastSelectedCellId: null,
  });
};

describe("editor store", () => {
  beforeEach(() => {
    resetStore();
    useEditorStore.getState().syncPages(4, 1);
  });

  it("creates pages with cell slots", () => {
    const state = useEditorStore.getState();
    expect(state.pages.length).toBe(1);
    expect(state.pages[0]?.cells.length).toBe(4);
  });

  it("fills next available cell", () => {
    const state = useEditorStore.getState();
    state.fillNextAvailable("product-1");
    const updated = useEditorStore.getState();
    expect(updated.pages[0]?.cells[0]?.productId).toBe("product-1");
  });

  it("assigns active product to selected cells", () => {
    const state = useEditorStore.getState();
    const firstCell = state.pages[0]?.cells[0]?.id;
    const secondCell = state.pages[0]?.cells[1]?.id;
    if (!firstCell || !secondCell) {
      throw new Error("Missing cells");
    }
    state.toggleCellSelection(firstCell);
    state.toggleCellSelection(secondCell);
    state.assignToSelected("product-2");
    const updated = useEditorStore.getState();
    expect(updated.pages[0]?.cells[0]?.productId).toBe("product-2");
    expect(updated.pages[0]?.cells[1]?.productId).toBe("product-2");
  });
});
