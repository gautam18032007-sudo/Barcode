import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale, locales } from "./lib/i18n";

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = isLocale(locale) ? locale : defaultLocale;
  if (!locales.includes(resolvedLocale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default,
  };
});
