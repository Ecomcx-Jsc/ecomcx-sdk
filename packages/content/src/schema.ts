/**
 * Mô tả thuộc tính của khối / định dạng chữ — dùng cho khối lõi dưới đây và cho khối của plugin (defineBlock).
 * Giá trị sai kiểu được ép về đúng kiểu nếu được (số dạng chuỗi → số), không ép được thì bỏ (= giá trị mặc định).
 * `null` và "không có" là một: thuộc tính null không được lưu.
 */
export type AttrType = "string" | "number" | "integer" | "boolean" | "url" | "json";

export interface AttrSpec {
  type: AttrType;
  /** Giá trị khi không có — trình soạn và website dùng chung. */
  default?: unknown;
  /** Chỉ nhận các giá trị này. */
  enum?: readonly unknown[];
  /** Số: kẹp trong [min, max]. */
  min?: number;
  max?: number;
}

export interface NodeSpec {
  attrs?: Record<string, AttrSpec>;
}

const s = (extra: Partial<AttrSpec> = {}): AttrSpec => ({ type: "string", ...extra });
const n = (extra: Partial<AttrSpec> = {}): AttrSpec => ({ type: "number", ...extra });
const i = (extra: Partial<AttrSpec> = {}): AttrSpec => ({ type: "integer", ...extra });
const b = (extra: Partial<AttrSpec> = {}): AttrSpec => ({ type: "boolean", ...extra });
const url = (): AttrSpec => ({ type: "url" });
const align = s({ enum: ["left", "center", "right", "justify"] });
const media = { src: url(), name: s(), mime: s(), mediaId: { type: "json" } as AttrSpec, caption: s() };

/**
 * Khối lõi trong nội dung soạn thảo (khối `richtext`). Thuộc tính không có trong danh sách vẫn được giữ nguyên
 * (plugin có thể thêm thuộc tính vào khối lõi) — chỉ thuộc tính có mô tả mới được kiểm kiểu.
 */
export const CORE_NODES: Record<string, NodeSpec> = {
  doc: {},
  text: {},
  paragraph: { attrs: { textAlign: align } },
  heading: { attrs: { level: i({ min: 1, max: 6, default: 2 }), textAlign: align, id: s() } },
  bulletList: {},
  orderedList: { attrs: { start: i({ min: 0, default: 1 }) } },
  listItem: {},
  taskList: {},
  taskItem: { attrs: { checked: b({ default: false }) } },
  blockquote: {},
  codeBlock: { attrs: { language: s() } },
  hardBreak: {},
  horizontalRule: {},
  image: {
    attrs: {
      src: url(), alt: s(), title: s(), width: n({ min: 1 }), height: n({ min: 1 }), srcset: s(), webpSrcset: s(),
      mediaId: { type: "json" }, size: s({ default: "large" }), caption: s(), align: s({ enum: ["left", "right", "center", "wide", "full"] }),
    },
  },
  gallery: { attrs: { images: { type: "json", default: [] }, columns: i({ min: 1, max: 6, default: 3 }), caption: s() } },
  video: { attrs: { ...media, poster: url() } },
  audio: { attrs: { ...media } },
  file: { attrs: { ...media, size: n({ min: 0 }), embed: b({ default: true }), download: b() } },
  table: {},
  tableRow: {},
  tableHeader: { attrs: { colspan: i({ min: 1, default: 1 }), rowspan: i({ min: 1, default: 1 }), colwidth: { type: "json" } } },
  tableCell: { attrs: { colspan: i({ min: 1, default: 1 }), rowspan: i({ min: 1, default: 1 }), colwidth: { type: "json" } } },
  youtube: { attrs: { src: url(), start: i({ min: 0 }), width: n({ min: 1 }), height: n({ min: 1 }) } },
};

export const CORE_MARKS: Record<string, NodeSpec> = {
  bold: {}, italic: {}, underline: {}, strike: {}, code: {}, subscript: {}, superscript: {},
  highlight: { attrs: { color: s() } },
  textStyle: { attrs: { color: s() } },
  link: { attrs: { href: url(), target: s(), rel: s() } },
};

/** Ép giá trị theo mô tả. Trả về undefined = bỏ thuộc tính (dùng mặc định). */
export function coerceAttr(spec: AttrSpec, value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  let v: unknown = value;
  switch (spec.type) {
    case "string":
    case "url":
      if (typeof v === "number" || typeof v === "boolean") v = String(v);
      if (typeof v !== "string") return undefined;
      break;
    case "number":
    case "integer": {
      const num = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      if (!Number.isFinite(num)) return undefined;
      let x = spec.type === "integer" ? Math.round(num) : num;
      if (spec.min !== undefined) x = Math.max(spec.min, x);
      if (spec.max !== undefined) x = Math.min(spec.max, x);
      v = x;
      break;
    }
    case "boolean":
      if (v === "true") v = true; else if (v === "false") v = false;
      if (typeof v !== "boolean") return undefined;
      break;
    case "json":
      break;
  }
  if (spec.enum && !spec.enum.includes(v)) return undefined;
  return v;
}

/** Chuẩn hoá bộ thuộc tính: ép kiểu thuộc tính có mô tả, giữ nguyên thuộc tính khác, bỏ null. Rỗng → undefined. */
export function normalizeAttrs(attrs: unknown, spec?: Record<string, AttrSpec>): Record<string, unknown> | undefined {
  if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs as Record<string, unknown>)) {
    const v = spec?.[key] ? coerceAttr(spec[key], value) : value === null ? undefined : value;
    if (v !== undefined) out[key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
