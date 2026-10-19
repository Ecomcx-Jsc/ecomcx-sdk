import type { Site } from "./types";

/** Định dạng ngày theo date_format của site (dd/MM/yyyy, yyyy-MM-dd, d MMMM, yyyy…). */
export function formatDate(value: string | null | undefined, site?: Pick<Site, "dateFormat" | "timezone"> & { locale?: string }) {
  if (!value) return "";
  const d = new Date(value);
  const tz = site?.timezone || "Asia/Ho_Chi_Minh";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" })
      .formatToParts(d).map((p) => [p.type, p.value]),
  );
  const monthLong = new Intl.DateTimeFormat(site?.locale ?? "vi", { timeZone: tz, month: "long" }).format(d);
  const fmt = site?.dateFormat || "dd/MM/yyyy";
  return fmt
    .replace("yyyy", parts.year)
    .replace("MMMM", monthLong)
    .replace("MM", parts.month)
    .replace("dd", parts.day)
    .replace(/\bd\b/, String(Number(parts.day)));
}

export function setting<T = string>(settings: Record<string, unknown>, key: string, fallback: T): T {
  const v = settings?.[key];
  return (v === undefined || v === null || v === "" ? fallback : v) as T;
}

export function pageLink(basePath: string, page: number, search?: string | null) {
  const base = basePath === "/" ? "" : basePath.replace(/\/$/, "");
  const path = page <= 1 ? base || "/" : `${base}/page/${page}`;
  return search ? `${path}${path.includes("?") ? "&" : "?"}s=${encodeURIComponent(search)}` : path;
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
