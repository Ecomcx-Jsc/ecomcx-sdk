import { readFileSync } from "node:fs";

// Gói npm (org @ecomcx) — theme/plugin import đúng tên này
export const THEME_SDK = "@ecomcx/nexus-theme-sdk", ADMIN_SDK = "@ecomcx/nexus-admin-sdk", CONTENT = "@ecomcx/nexus-content";
export const CLI = "@ecomcx/create-nexus";
/** Tên cũ (trước khi lên npm) → tên mới: core vẫn hiểu import cũ, validate nhắc đổi, upgrade giữ bí danh để code cũ còn chạy. */
export const OLD_NAMES = { "@cms/theme-sdk": THEME_SDK, "@cms/admin-sdk": ADMIN_SDK, "@cms/content": CONTENT };
/** Phiên bản của CLI = phiên bản SDK phát hành cùng đợt. */
export const VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
