/**
 * Tuỳ chọn hiển thị của người đọc (sáng/tối, cỡ chữ…). Lưu ở cookie "cms-pref-{key}" để server render đúng ngay lần tải đầu.
 * Theme/plugin dùng API này thay vì đọc/ghi document.cookie (bị bộ quét bảo mật chặn).
 * Giới hạn: key [a-z0-9-] tối đa 32 ký tự; value [a-zA-Z0-9_-] tối đa 64 ký tự — không thể dùng để lưu dữ liệu nhạy cảm.
 */
export const PREF_PREFIX = "cms-pref-";
const KEY = /^[a-z0-9-]{1,32}$/;
const VALUE = /^[A-Za-z0-9_-]{0,64}$/;

export const isValidPreference = (key: string, value: string) => KEY.test(key) && VALUE.test(value);

/** Đọc tuỳ chọn ở Server Component (layout/template). */
export async function getPreference(key: string): Promise<string | undefined> {
  if (!KEY.test(key)) return undefined;
  const { cookies } = await import("next/headers");
  const v = (await cookies()).get(PREF_PREFIX + key)?.value;
  return v !== undefined && VALUE.test(v) ? v : undefined;
}
