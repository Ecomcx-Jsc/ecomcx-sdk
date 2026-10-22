#!/usr/bin/env node
// Đóng gói @cms/admin-sdk, @cms/theme-sdk thành tarball (JavaScript đã biên dịch + .d.ts) để đính kèm GitHub Release.
// Core và plugin cài bằng URL cố định phiên bản (npm không cài được thư mục con của repo git):
//   "@cms/theme-sdk": "https://github.com/Ecomcx-Jsc/ecomcx-sdk/releases/download/v1.0.0/cms-theme-sdk-1.0.0.tgz"
//
//   node scripts/release.mjs            → build + đóng gói vào dist-release/
//   node scripts/release.mjs --check    → như trên + cài thử vào dự án trống, kiểm tra import / .d.ts / "use client"
// CLI create-cms không cần tarball: chạy thẳng từ repo (npx github:Ecomcx-Jsc/ecomcx-sdk#<tag> …).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "dist-release");
const check = process.argv.includes("--check");
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString();
const PACKAGES = ["packages/admin-sdk", "packages/theme-sdk"];

/** "./api" → "./api.js", "./x" (thư mục) → "./x/index.js": Node ESM và webpack (gói type: module) bắt buộc đuôi đầy đủ. */
function fixSpecifiers(dir) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) { fixSpecifiers(file); continue; }
    if (!/\.(js|d\.ts)$/.test(name)) continue;
    const src = readFileSync(file, "utf8");
    const fixed = src.replace(/((?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"']+?)(["'])/g, (m, a, spec, z) => {
      if (/\.(js|css|json)$/.test(spec)) return m;
      const base = path.resolve(path.dirname(file), spec);
      return a + (existsSync(base) && statSync(base).isDirectory() ? `${spec}/index.js` : `${spec}.js`) + z;
    });
    if (fixed !== src) writeFileSync(file, fixed);
  }
}

/** package.json bản phát hành: trỏ vào dist/, bỏ script nội bộ. */
function releaseManifest(pkg) {
  const toDist = (p) => p.replace(/^\.\/src\//, "./dist/").replace(/\.tsx?$/, ".js");
  const exportsMap = {};
  for (const [k, v] of Object.entries(pkg.exports ?? { ".": pkg.main })) {
    if (typeof v !== "string") continue;
    exportsMap[k] = { types: toDist(v).replace(/\.js$/, ".d.ts"), import: toDist(v), default: toDist(v) };
  }
  exportsMap["./package.json"] = "./package.json";
  const { scripts, devDependencies, ...rest } = pkg;
  const files = ["dist", "README.md", ...(pkg.files ?? []).filter((f) => f !== "src" && f !== "README.md")];
  return { ...rest, main: toDist(pkg.main), types: toDist(pkg.main).replace(/\.js$/, ".d.ts"), exports: exportsMap, files, sideEffects: false };
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const tarballs = [];
const versions = new Set();

for (const dir of PACKAGES) {
  const pkg = JSON.parse(readFileSync(path.join(root, dir, "package.json"), "utf8"));
  versions.add(pkg.version);
  const stage = path.join(out, "stage", pkg.name.replace("/", "__"));
  // Biên dịch trong node_modules của repo (thư viện phụ thuộc + kiểu của chúng đã được hoist ở đó)
  const work = path.join(root, "node_modules", ".cms-release", path.basename(dir));
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  cpSync(path.join(root, dir, "src"), path.join(work, "src"), { recursive: true });
  writeFileSync(path.join(work, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", lib: ["dom", "dom.iterable", "esnext"], module: "esnext", moduleResolution: "bundler", jsx: "react-jsx",
      strict: true, skipLibCheck: true, isolatedModules: true, declaration: true, outDir: path.join(stage, "dist"), rootDir: "src",
    },
    include: ["src"],
  }));
  run(path.join(root, "node_modules", ".bin", "tsc"), ["-p", work], work);
  rmSync(work, { recursive: true, force: true });
  fixSpecifiers(path.join(stage, "dist"));
  for (const extra of (pkg.files ?? []).filter((f) => f !== "src" && f !== "README.md"))
    if (existsSync(path.join(root, dir, extra))) cpSync(path.join(root, dir, extra), path.join(stage, extra), { recursive: true });
  if (existsSync(path.join(root, dir, "README.md"))) cpSync(path.join(root, dir, "README.md"), path.join(stage, "README.md"));
  writeFileSync(path.join(stage, "package.json"), JSON.stringify(releaseManifest(pkg), null, 2) + "\n");
  tarballs.push(path.join(out, run("npm", ["pack", "--silent", "--pack-destination", out], stage).trim().split("\n").pop()));
}
rmSync(path.join(out, "stage"), { recursive: true, force: true });
if (versions.size !== 1) throw new Error(`Các gói phải cùng phiên bản (đang có ${[...versions].join(", ")})`);
const version = [...versions][0];

// Bản sao không chứa số phiên bản để URL /releases/latest/download/cms-theme-sdk.tgz luôn cố định
cpSync(path.join(out, `cms-admin-sdk-${version}.tgz`), path.join(out, "cms-admin-sdk.tgz"));
cpSync(path.join(out, `cms-theme-sdk-${version}.tgz`), path.join(out, "cms-theme-sdk.tgz"));

if (check) {
  const tmp = path.join(out, "check");
  mkdirSync(tmp, { recursive: true });
  writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "check", private: true, type: "module" }));
  run("npm", ["install", "--no-audit", "--no-fund", "--silent", "--legacy-peer-deps", ...tarballs, "react@19.2.0", "react-dom@19.2.0"], tmp);
  writeFileSync(path.join(tmp, "check.mjs"), `
    const admin = await import("@cms/admin-sdk");
    if (typeof admin.registerPage !== "function") throw new Error("@cms/admin-sdk thiếu export");
    console.log("  ✓ @cms/admin-sdk import được (Node ESM)");
    const content = await import("@cms/content");
    if (content.normalizeContent({ type: "doc", content: [] }).doc.version !== 1) throw new Error("@cms/content sai");
    console.log("  ✓ @cms/content (phụ thuộc của theme-sdk, cài từ GitHub) import được");
  `);
  console.log(run("node", ["check.mjs"], tmp).trim());
  for (const f of ["@cms/admin-sdk/dist/index.d.ts", "@cms/theme-sdk/dist/index.d.ts", "@cms/theme-sdk/dist/client.js", "@cms/content/dist/index.js"])
    if (!existsSync(path.join(tmp, "node_modules", f))) throw new Error(`Thiếu ${f}`);
  const client = readFileSync(path.join(tmp, "node_modules/@cms/theme-sdk/dist/client.js"), "utf8");
  if (!client.startsWith('"use client"')) throw new Error('theme-sdk/client.js mất chỉ thị "use client"');
  console.log('  ✓ Có .d.ts, "use client" giữ nguyên');
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`Đã đóng gói v${version} trong dist-release/:`);
for (const f of readdirSync(out)) console.log("  " + f);
console.log(`\nPhát hành: gh release create v${version} dist-release/*.tgz --title "SDK v${version}"`);
console.log(`Cài: https://github.com/Ecomcx-Jsc/ecomcx-sdk/releases/download/v${version}/<tên file>`);
