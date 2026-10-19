import { cache } from "react";

/** Header do proxy.ts của frontend gắn vào request: mã ngôn ngữ lấy từ tiền tố URL (/en/...). */
export const LOCALE_HEADER = "x-cms-locale";

/** Ngôn ngữ của request hiện tại (undefined = ngôn ngữ mặc định của site). */
export const getRequestLocale = cache(async (): Promise<string | undefined> => {
  try {
    const { headers } = await import("next/headers");
    return (await headers()).get(LOCALE_HEADER) ?? undefined;
  } catch {
    return undefined; // ngoài request (build, route tĩnh)
  }
});

/** Đường dẫn có tiền tố ngôn ngữ: localeHref(site, "/author/an") → "/en/author/an" khi đang ở tiếng Anh. */
export function localeHref(site: { locale: string; defaultLocale: string }, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (site.locale === site.defaultLocale) return p;
  return p === "/" ? `/${site.locale}` : `/${site.locale}${p}`;
}
