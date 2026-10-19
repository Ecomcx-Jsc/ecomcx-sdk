#!/usr/bin/env node
// create-cms — tạo, kiểm tra, đóng gói và triển khai theme/plugin cho CMS.
//   create-cms theme "Tên" [--parent default] [--dir x]
//   create-cms plugin "Tên" [--no-backend] [--no-admin] [--no-frontend] [--dir x]
//   create-cms validate [thư-mục]
//   create-cms pack [thư-mục] [--out dist]
//   create-cms deploy [thư-mục] [--url …] [--user …] [--password …] [--activate]
//   create-cms dev [thư-mục] [--url …] [--user …] [--password …]   (tự đóng gói + cài lại khi sửa file)
//   create-cms env up | status | down [--purge]
import fs from "node:fs";
import path from "node:path";
import { c, parseArgs } from "../lib/util.mjs";
import { scaffoldPlugin, scaffoldTheme } from "../lib/scaffold.mjs";
import { validate } from "../lib/validate.mjs";
import { pack } from "../lib/pack.mjs";
import { deploy } from "../lib/deploy.mjs";
import { env, findEnv } from "../lib/env.mjs";

const HELP = `${c.bold("create-cms")} — công cụ viết theme/plugin cho CMS

  ${c.cyan('theme "Tên"')} [--parent default]      tạo theme (child theme với --parent)
  ${c.cyan('plugin "Tên"')} [--no-backend|--no-admin|--no-frontend]   tạo plugin
  ${c.cyan("validate")} [thư-mục]                  kiểm tra theme.json / plugin.json
  ${c.cyan("pack")} [thư-mục] [--out dist]         đóng gói → dist/<slug>-<version>.zip
  ${c.cyan("deploy")} [thư-mục] [--activate]       đóng gói + cài lên CMS (--url, --user, --password)
  ${c.cyan("dev")} [thư-mục]                       tự đóng gói + cài lại mỗi khi sửa file
  ${c.cyan("env")} up | status | down [--purge]   CMS chạy bằng Docker để thử theme/plugin

Mặc định CMS ở http://localhost:5100 (hoặc môi trường của \`env up\`, biến CMS_URL / CMS_USER / CMS_PASSWORD).`;

const args = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = args._;

/** Thông tin đăng nhập: tham số dòng lệnh → môi trường của `env up` (.cms-env) → biến môi trường (deploy tự đọc). */
function connection() {
  const saved = findEnv();
  return {
    url: args.url ?? (process.env.CMS_URL ? undefined : saved?.url),
    user: args.user ?? (process.env.CMS_USER ? undefined : saved?.user),
    password: args.password ?? (process.env.CMS_PASSWORD ? undefined : saved?.password),
    activate: !!args.activate,
  };
}

function report({ kind, errors, warnings }, dir) {
  warnings.forEach((w) => console.log(c.yellow("  ! " + w)));
  errors.forEach((e) => console.log(c.red("  ✗ " + e)));
  if (errors.length) return false;
  console.log(c.green(`✓ ${kind === "theme" ? "Theme" : "Plugin"} hợp lệ`) + c.dim(` (${path.relative(process.cwd(), dir) || "."})`));
  return true;
}

async function packAndReport(dir) {
  const r = await pack(dir, { out: args.out });
  console.log(c.green(`✓ ${path.relative(process.cwd(), r.zipPath)}`) + c.dim(` (${(r.size / 1024).toFixed(0)} KB)`));
  return r;
}

/** Theo dõi thay đổi (bỏ dist, node_modules, bin, obj) rồi đóng gói + cài lại; gộp các lần lưu liên tiếp. */
async function dev(dir) {
  const conn = connection();
  let running = false, again = false, timer;
  const cycle = async () => {
    if (running) { again = true; return; }
    running = true;
    try { await deploy(await packAndReport(dir), { ...conn, activate: true }); }
    catch (e) { console.log(c.red("✗ " + e.message)); }
    running = false;
    if (again) { again = false; cycle(); }
  };
  await cycle();
  console.log(c.dim("• Đang theo dõi thay đổi… (Ctrl+C để dừng)"));
  const ignored = /(^|[\\/])(dist|node_modules|bin|obj|\.git|\.next)([\\/]|$)/;
  fs.watch(dir, { recursive: true }, (_e, file) => {
    if (!file || ignored.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => { console.log(c.cyan(`\n• ${file} thay đổi`)); cycle(); }, 400);
  });
}

try {
  const dir = path.resolve(rest[0] && !["theme", "plugin", "env"].includes(cmd) ? rest[0] : ".");
  switch (cmd) {
    case "theme":
    case "plugin": {
      const name = rest[0];
      if (!name) throw new Error(`Thiếu tên: create-cms ${cmd} "Tên ${cmd}"`);
      const { root } = cmd === "theme"
        ? scaffoldTheme(name, { parent: args.parent, dir: args.dir })
        : scaffoldPlugin(name, { backend: !args["no-backend"], admin: !args["no-admin"], frontend: !args["no-frontend"], dir: args.dir });
      console.log(c.green(`✓ Đã tạo ${cmd} ở ${path.relative(process.cwd(), root)}`));
      console.log(c.dim(`  cd ${path.relative(process.cwd(), root)} && npx create-cms dev`));
      break;
    }
    case "validate":
      if (!report(validate(dir), dir)) process.exit(1);
      break;
    case "pack":
      await packAndReport(dir);
      break;
    case "deploy":
      await deploy(await packAndReport(dir), connection());
      break;
    case "dev":
      await dev(dir);
      break;
    case "env":
      await env(rest[0], args);
      break;
    case undefined:
    case "help":
    case "--help":
      console.log(HELP);
      break;
    default:
      console.log(HELP);
      process.exit(1);
  }
} catch (e) {
  console.error(c.red("✗ " + (e?.message ?? e)));
  process.exit(1);
}
