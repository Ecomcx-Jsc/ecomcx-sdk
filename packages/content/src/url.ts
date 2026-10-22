/**
 * URL an toàn cho href/src: http(s), mailto, tel, tương đối (/, #, ?, ./), ảnh data:image/* (không SVG).
 * Cùng quy tắc với ContentSanitizer.IsSafeUrl của máy chủ.
 */
export function isSafeUrl(url: unknown): boolean {
  if (url == null || url === "") return true;
  // Bỏ ký tự điều khiển/khoảng trắng mà trình duyệt bỏ qua khi phân tích ("java\tscript:")
  const u = String(url).replace(/[\u0000- ]/g, "").toLowerCase();
  if (u.startsWith("data:")) return u.startsWith("data:image/") && !u.startsWith("data:image/svg");
  const colon = u.indexOf(":");
  if (colon < 0) return true;
  const sep = u.search(/[/?#]/);
  if (sep >= 0 && sep < colon) return true; // ":" nằm sau phần đường dẫn → URL tương đối
  return ["http", "https", "mailto", "tel"].includes(u.slice(0, colon));
}

/** URL an toàn hoặc chuỗi thay thế. */
export const safeUrl = (url: unknown, fallback = "#"): string => (isSafeUrl(url) && url != null ? String(url) : fallback);
