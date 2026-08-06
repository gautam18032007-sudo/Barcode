"use client";

import { useEffect } from "react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">
        Something went wrong · Algo salió mal
      </h1>
      <p className="max-w-md text-sm text-slate-500">
        An unexpected error occurred. Please try again — your products and layout
        are kept in this session. · Ocurrió un error inesperado. Inténtalo de
        nuevo; tus productos y diseño se conservan en esta sesión.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Try again · Reintentar
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Reload · Recargar
        </button>
      </div>
    </div>
  );
}
