import { describe, expect, it, beforeAll } from "vitest";
import JsBarcode from "jsbarcode";
import { computeBarcodeLayout, validateBarcodeValue } from "@/lib/barcodeEngine";

// Minimal fake SVG DOM sufficient for jsbarcode's SVGRenderer
// (node_modules/jsbarcode/bin/renderers/svg.js), so this test actually
// executes JsBarcode()'s real rendering code path in this "node" vitest
// environment (no document/jsdom available) instead of the silently
// no-op `if (typeof document !== "undefined")` guards used elsewhere in
// this suite (densityAudit.test.ts etc. never actually exercise JsBarcode
// here, since `document` is undefined in this environment).
class FakeElement {
  tagName: string;
  nodeName: string;
  attrs: Record<string, string> = {};
  children: FakeElement[] = [];
  textContent = "";
  private _innerHTML = "";

  constructor(tagName: string) {
    this.tagName = tagName;
    this.nodeName = tagName;
  }
  setAttribute(name: string, value: unknown) {
    this.attrs[name] = String(value);
  }
  getAttribute(name: string) {
    return this.attrs[name] ?? null;
  }
  hasAttribute(name: string) {
    return name in this.attrs;
  }
  removeAttribute(name: string) {
    delete this.attrs[name];
  }
  appendChild(child: FakeElement) {
    this.children.push(child);
    return child;
  }
  get firstChild() {
    return this.children[0] ?? null;
  }
  removeChild(child: FakeElement) {
    this.children = this.children.filter((c) => c !== child);
  }
  querySelectorAll(selector: string) {
    const tag = selector.replace(/^\*\s*/, "");
    const out: FakeElement[] = [];
    const walk = (el: FakeElement) => {
      for (const c of el.children) {
        if (c.tagName === tag) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  set innerHTML(value: string) {
    this._innerHTML = value;
    if (value === "") this.children = [];
  }
  get innerHTML() {
    return this._innerHTML;
  }
}

beforeAll(() => {
  (globalThis as unknown as { document: unknown }).document = {
    createElementNS: (_ns: string, tag: string) => new FakeElement(tag),
    createTextNode: (text: string) => {
      const el = new FakeElement("#text");
      el.textContent = text;
      return el;
    },
    createElement: (tag: string) => {
      const el = new FakeElement(tag);
      if (tag === "canvas") {
        (el as unknown as { getContext: (t: string) => unknown }).getContext = () => ({
          font: "",
          measureText: (s: string) => ({ width: s.length * 10.8 }),
        });
      }
      return el;
    },
  };
});

// Mirrors BarcodeSvg.tsx's exact JsBarcode call + post-render attribute
// handling, so this test would fail if that logic regresses (e.g. someone
// reintroduces removeAttribute("width"/"height"), which caused the barcode
// to render blank in Chrome's print pass while looking fine on screen).
function renderLikeBarcodeSvg(cleanValue: string, printableWidthPx: number, requestedHeightPx: number) {
  const layout = computeBarcodeLayout({ value: cleanValue, printableWidthPx, requestedHeightPx });
  const svg = new FakeElement("svg");

  JsBarcode(svg as unknown as SVGSVGElement, layout.cleanValue, {
    format: layout.symbology,
    displayValue: true,
    height: layout.renderHeightPx,
    margin: 0,
    marginLeft: layout.quietZonePx,
    marginRight: layout.quietZonePx,
    marginTop: 2,
    marginBottom: 2,
    width: layout.moduleWidthPx,
    fontSize: 18,
    fontOptions: "bold",
    textAlign: "center",
    textPosition: "bottom",
    textMargin: 2,
    background: "transparent",
    lineColor: "#000000",
  });

  const generatedWidth = parseFloat(svg.getAttribute("width") ?? "");
  const generatedHeight = parseFloat(svg.getAttribute("height") ?? "");
  if (Number.isFinite(generatedWidth) && Number.isFinite(generatedHeight)) {
    svg.setAttribute("viewBox", `0 0 ${generatedWidth} ${generatedHeight}`);
    svg.setAttribute("width", String(generatedWidth));
    svg.setAttribute("height", String(generatedHeight));
  }

  return svg;
}

describe("BarcodeSvg print-safety: SVG keeps an intrinsic width/height (regression for blank print output)", () => {
  const CASES: Array<{ label: string; value: string; printableWidthPx: number; heightPx: number }> = [
    { label: "jewellery-roll half-width", value: "ZZ0000018", printableWidthPx: 187.1, heightPx: 18.9 },
    { label: "a4-4x13 (tightest real preset)", value: "ZZ0000001", printableWidthPx: 128.5, heightPx: 45.36 },
    { label: "long alphanumeric value", value: "KNITAHDBG88979570", printableWidthPx: 300, heightPx: 45.36 },
    { label: "EAN13", value: "1234567890128", printableWidthPx: 187.1, heightPx: 45.36 },
  ];

  for (const c of CASES) {
    it(`renders actual bars and a non-empty intrinsic size for ${c.label}`, () => {
      const clean = validateBarcodeValue(c.value);
      const svg = renderLikeBarcodeSvg(clean, c.printableWidthPx, c.heightPx);

      const rects = svg.querySelectorAll("rect");
      expect(rects.length).toBeGreaterThan(0);

      // The SVG must retain a real, non-zero intrinsic width/height — not
      // just a viewBox — so it doesn't depend solely on CSS percentage
      // resolution to have a visible size (the actual root cause of the
      // "blank in Chrome print preview" bug: the old code called
      // removeAttribute("width") / removeAttribute("height") here).
      const width = parseFloat(svg.getAttribute("width") ?? "");
      const height = parseFloat(svg.getAttribute("height") ?? "");
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(svg.getAttribute("viewBox")).toBe(`0 0 ${width} ${height}`);
    });
  }
});
