import fs from "node:fs";
import path from "node:path";
import { readJson } from "./util.mjs";

const SLUG = /^[a-z0-9][a-z0-9-]{1,63}$/;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+].*)?$/;
const FIELD_TYPES = ["text", "textarea", "number", "checkbox", "select", "color", "media", "url", "email", "richtext", "menu"];

/** Kiểm tra theme hoặc plugin. Trả về { kind, manifest, errors, warnings }. */
export function validate(dir) {
  const errors = [];
  const warnings = [];
  const themeJson = path.join(dir, "theme.json");
  const pluginJson = path.join(dir, "plugin.json");
  const kind = fs.existsSync(themeJson) ? "theme" : fs.existsSync(pluginJson) ? "plugin" : null;
  if (!kind) return { kind: null, manifest: null, errors: ["Không tìm thấy theme.json hoặc plugin.json"], warnings };
  const manifest = readJson(kind === "theme" ? themeJson : pluginJson);
  if (!manifest) return { kind, manifest: null, errors: [`${kind}.json không phải JSON hợp lệ`], warnings };

  if (!manifest.name) errors.push("Thiếu name");
  if (!SLUG.test(manifest.slug ?? "")) errors.push("slug chỉ gồm a-z, 0-9, dấu gạch ngang (2–64 ký tự)");
  if (!SEMVER.test(manifest.version ?? "")) errors.push("version phải theo semver, vd 1.0.0");
  // Bản dịch giao diện admin: { "en": { "Chuỗi gốc": "Translation" } }
  if (manifest.translations !== undefined) {
    const t = manifest.translations;
    const okShape = t && typeof t === "object" && !Array.isArray(t) && Object.entries(t).every(([code, d]) =>
      /^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(code) && d && typeof d === "object" && !Array.isArray(d) && Object.values(d).every((v) => typeof v === "string"));
    if (!okShape) errors.push('translations phải có dạng { "en": { "Chuỗi gốc": "Bản dịch" } }');
  }
  if (!manifest.requires?.cms) warnings.push('Nên khai báo requires.cms, vd ">=1.0.0 <2.0.0"');

  if (kind === "theme") {
    const templates = path.join(dir, "templates");
    if (!manifest.parent && !fs.existsSync(path.join(templates, "index.tsx")) && !fs.existsSync(path.join(templates, "index.ts")))
      errors.push("Theme cần templates/index.tsx (template dự phòng cuối cùng)");
    for (const f of manifest.settings ?? []) {
      if (!f.key) errors.push("settings: thiếu key");
      if (!FIELD_TYPES.includes(f.type)) errors.push(`settings.${f.key}: type "${f.type}" không hợp lệ (${FIELD_TYPES.join(", ")})`);
      if (f.type === "select" && !f.options?.length) errors.push(`settings.${f.key}: select cần options`);
    }
    if (manifest.screenshot && !fs.existsSync(path.join(dir, manifest.screenshot))) warnings.push(`Không thấy ảnh ${manifest.screenshot}`);
    if (fs.existsSync(path.join(dir, "node_modules"))) warnings.push("node_modules sẽ bị loại khỏi gói");
  } else {
    if (!manifest.backend && !manifest.admin && !manifest.frontend) errors.push("Plugin cần ít nhất một phần: backend, admin hoặc frontend");
    if (manifest.backend && !/\.dll$/i.test(manifest.backend.assembly ?? "")) errors.push("backend.assembly phải là đường dẫn .dll, vd backend/MyPlugin.dll");
    if (manifest.admin && !/\.js$/i.test(manifest.admin.entry ?? "")) errors.push("admin.entry phải là file .js đã build, vd admin/index.js");
    if (manifest.frontend && !/\.(tsx?|jsx?)$/.test(manifest.frontend.entry ?? "")) errors.push("frontend.entry phải là .ts/.tsx/.js/.jsx");
    for (const r of manifest.frontend?.routes ?? [])
      if (typeof r !== "string" || !/^\/[a-z0-9._-]+(\/[a-z0-9._-]+)*$/.test(r) || /^\/(api|_next|admin|uploads|extensions|hubs|feed)(\/|$)|^\/(sitemap\.xml|robots\.txt|favicon\.ico)$/.test(r))
        errors.push(`frontend.routes: đường dẫn "${r}" không hợp lệ hoặc trùng đường dẫn của hệ thống`);
    if (manifest.frontend && !fs.existsSync(path.join(dir, manifest.frontend.entry))) errors.push(`Không thấy ${manifest.frontend.entry}`);
    if (manifest.admin && !fs.existsSync(path.join(dir, "admin", "src")) && !fs.existsSync(path.join(dir, manifest.admin.entry)))
      errors.push("Không thấy admin/src/index.tsx (source) hoặc bundle admin đã build");
    if (manifest.backend && !fs.readdirSync(path.join(dir, "backend")).some((f) => f.endsWith(".csproj")) && !fs.existsSync(path.join(dir, manifest.backend.assembly)))
      errors.push("Không thấy backend/*.csproj hoặc DLL đã build");
  }
  return { kind, manifest, errors, warnings };
}
