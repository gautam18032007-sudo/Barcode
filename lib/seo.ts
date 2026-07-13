import { defaultLocale, type Locale } from "./i18n";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const resolveBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (raw) {
    const normalized = raw.trim();
    if (normalized) {
      const url = normalized.startsWith("http") ? normalized : `https://${normalized}`;
      return normalizeBaseUrl(url);
    }
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  // Graceful fallback to prevent production build failure when env variable is missing
  return "https://labels.example.com";
};

export const getBaseUrl = () => resolveBaseUrl();

const normalizePath = (path: string) => {
  if (!path) {
    return "";
  }
  return `/${path.replace(/^\/+/, "")}`;
};

export const getCanonicalUrl = (locale: Locale, path = "") =>
  `${getBaseUrl()}/${locale}${normalizePath(path)}`;

export const getAlternateLanguages = (path = "") => {
  const normalizedPath = normalizePath(path);
  const baseUrl = getBaseUrl();

  return {
    en: `${baseUrl}/en${normalizedPath}`,
    es: `${baseUrl}/es${normalizedPath}`,
    "x-default": `${baseUrl}/${defaultLocale}${normalizedPath}`,
  } as const;
};

export const getOpenGraphLocale = (locale: Locale) =>
  locale === "es" ? "es_ES" : "en_US";
