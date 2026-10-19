/** Tên cookie phiên đăng nhập của website (httpOnly, do frontend core đặt). Dùng chung cho proxy và SDK. */
export const ACCESS_COOKIE = "cms_at";
export const REFRESH_COOKIE = "cms_rt";

/** Người dùng đang đăng nhập trên website. */
export interface CurrentUser {
  id: number;
  email: string;
  userName: string;
  displayName: string;
  roles: string[];
  capabilities: string[];
}

/** Chỉ nhận đường dẫn nội bộ ("/account") — chặn chuyển hướng ra trang ngoài (?redirect=https://lừa-đảo). */
export function safeRedirect(target: string | null | undefined, fallback = "/") {
  return target && target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\") ? target : fallback;
}
