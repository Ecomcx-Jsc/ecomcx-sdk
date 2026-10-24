import { readFileSync } from "node:fs";

// Gói npm (org @ecomcx): code theme/plugin vẫn import "@cms/…", cài bằng bí danh "npm:@ecomcx/nexus-…@^x.y.z"
export const NPM = { "@cms/theme-sdk": "@ecomcx/nexus-theme-sdk", "@cms/admin-sdk": "@ecomcx/nexus-admin-sdk", "@cms/content": "@ecomcx/nexus-content" };
export const CLI = "@ecomcx/create-nexus";
/** Phiên bản của CLI = phiên bản SDK phát hành cùng đợt. */
export const VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
export const alias = (name, version = VERSION) => `npm:${NPM[name]}@^${version}`;
