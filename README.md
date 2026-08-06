# Labbely

**Print-ready barcode labels.**

Labbely is a **web-based barcode label generator** for companies. It lets you build print-ready A4 label sheets in the browser (using a grid/layout), assign products to labels, and print them on **conventional printers** to support inventory workflows.

It includes an optional **Odoo 17 JSON-RPC integration** to search products (by `name`, `barcode`, `default_code`) and import them into the label editor.

## What’s in the app (based on the current code)

- **Two modes**
  - **Manual**: create products with name + barcode (optional SKU).
  - **Odoo**: log in and search products via `/api/auth/login` and `/api/products/search`.
- **Label sheet editor**
  - Multi-select labels (click, Shift-range, Ctrl/⌘ toggle, drag-select).
  - Assign products to selected labels via a popover selector.
  - Actions like fill next empty, fill N labels, fill all pages, clear selection, undo/redo.
- **Print output**
  - Print-only pages with the configured paper/label layout (A4 presets included).
  - Barcodes rendered with `jsbarcode` (auto-detected format).
- **i18n + SEO**
  - Localized routes `/{locale}/...` with `next-intl` (`en`, `es`).
  - `robots.ts` + `sitemap.ts` with locale alternates.
  - Localized metadata via `next-intl/server`.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Odoo 17 integration notes

- **Login**: `/{locale}/login` posts to `POST /api/auth/login` (Odoo `common.authenticate`).
- **Session**: stored in an HTTP-only cookie `app_session`.
- **Search**: `GET /api/products/search?q=...` calls `product.template.search_read`.

### Important limitation (current implementation)

Sessions are stored **in-memory** (a `Map` in `lib/sessionStore.ts`). That means:
- restarting the server logs everyone out
- it won’t work across multiple server instances

## Environment variables

- `NEXT_PUBLIC_SITE_URL`: used for sitemap/robots/metadata (defaults to `http://localhost:3000`)
- `ODOO_MOCK`: set to `"true"` to bypass real Odoo calls (mock login/search)

## Docker deployment

1) Copy `.env.example` to `.env` and set values.
2) Build and run:

```bash
docker compose up -d --build
```

The app will listen on `http://localhost:${APP_PORT}` (default `3001`).

## Open source + credits

- This repository is intended to be **open source** (add a `LICENSE` file before publishing if you haven’t yet).
- Built with help from **Codex 5.2**.
