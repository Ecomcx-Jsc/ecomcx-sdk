// Môi trường CMS chạy bằng Docker cho người làm theme/plugin — không cần mã nguồn CMS.
//   create-cms env up      dựng CMS (Postgres, Redis, API, website, Caddy) + cài đặt sẵn, in tài khoản quản trị
//   create-cms env status  trạng thái, địa chỉ, tài khoản
//   create-cms env down    dừng (giữ dữ liệu)  ·  --purge: xoá luôn dữ liệu
// Tài khoản được lưu ở .cms-env/credentials.json → `create-cms deploy/dev` tự dùng, không cần --password.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { c, readJson, run, write } from "./util.mjs";

const cliDir = path.dirname(fileURLToPath(import.meta.url));
/** Image dựng sẵn của CMS (đổi bằng --api-image/--builder-image hoặc biến CMS_API_IMAGE/CMS_BUILDER_IMAGE). */
const DEFAULT_IMAGES = { api: "ghcr.io/dungnecauoi/cms-api:1", builder: "ghcr.io/dungnecauoi/cms-builder:1" };

/** File cấu hình đi kèm gói (lib/env/) hoặc lấy từ thư mục deploy/ khi chạy trong repo CMS. */
function asset(name) {
  for (const p of [path.join(cliDir, "env", name), path.resolve(cliDir, "../../../deploy", name)]) if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  throw new Error(`Thiếu file ${name} của create-cms`);
}

/** Tìm .cms-env gần nhất (thư mục hiện tại hoặc thư mục cha) — dùng cho deploy/dev. */
export function findEnv(start = process.cwd()) {
  for (let dir = path.resolve(start); ; dir = path.dirname(dir)) {
    const cred = readJson(path.join(dir, ".cms-env", "credentials.json"));
    if (cred) return cred;
    if (path.dirname(dir) === dir) return null;
  }
}

const compose = (o) => `
# Sinh bởi create-cms env — môi trường thử cho theme/plugin. Không dùng cho website thật.
name: ${o.project}
services:
  init:
    image: alpine:3.20
    command: ["/bin/sh", "/init-secrets.sh"]
    volumes: [secrets:/secrets, ./init-secrets.sh:/init-secrets.sh:ro]
    restart: "no"
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    depends_on: { init: { condition: service_completed_successfully } }
    environment: { POSTGRES_USER: cms, POSTGRES_DB: cms, POSTGRES_PASSWORD_FILE: /secrets/db_password }
    volumes: [pgdata:/var/lib/postgresql/data, secrets:/secrets:ro]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U cms"], interval: 3s, retries: 40 }
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: 3s, retries: 20 }
  api:
    image: ${o.apiImage}
    restart: unless-stopped
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
    environment:
      CMS_SECRETS_DIR: /secrets
      ConnectionStrings__Redis: redis:6379
      Storage__PublicMediaUrl: ${o.url}/uploads
      Frontend__PublicUrl: ${o.url}
      Frontend__RevalidateUrl: http://builder:3000/api/revalidate
      Extensions__BuilderUrl: http://builder:4100
      Extensions__CallbackBaseUrl: http://api:8080
      Setup__AdminUrl: ${o.url}/admin
      Security__TrustedProxyHosts__0: caddy
      Cors__Origins__0: ${o.url}
      Security__FrameAncestors__0: ${o.url}
    volumes: [storage:/data, secrets:/secrets:ro]
  builder:
    image: ${o.builderImage}
    restart: unless-stopped
    depends_on: [api]
    environment: { CMS_SECRETS_DIR: /secrets, CMS_API_URL: http://api:8080, ADMIN_ORIGINS: ${o.url}, WEB_WORKERS: "1", TRUSTED_PROXY_HOSTS: caddy }
    volumes: [storage:/data, secrets:/secrets:ro]
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    depends_on: [api, builder]
    environment: { SITE_ADDRESS: ":80" }
    ports: ["${o.port}:80"]
    volumes: [./Caddyfile:/etc/caddy/Caddyfile:ro]
volumes: { pgdata: {}, storage: {}, secrets: {} }
`;

async function waitFor(url, seconds) {
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); if (r.ok) return true; } catch { /* chưa sẵn sàng */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export async function env(action, args) {
  const dir = path.resolve(args.dir ?? ".cms-env");
  const credFile = path.join(dir, "credentials.json");
  const saved = readJson(credFile);
  const project = saved?.project ?? `cms-dev-${crypto.createHash("sha1").update(dir).digest("hex").slice(0, 6)}`;
  const dc = (...a) => run("docker", ["compose", "-f", path.join(dir, "docker-compose.yml"), ...a], { quiet: true });

  if (action === "up") {
    const port = Number(args.port ?? saved?.port ?? 8080);
    const url = `http://localhost:${port}`;
    const apiImage = args["api-image"] ?? process.env.CMS_API_IMAGE ?? saved?.apiImage ?? DEFAULT_IMAGES.api;
    const builderImage = args["builder-image"] ?? process.env.CMS_BUILDER_IMAGE ?? saved?.builderImage ?? DEFAULT_IMAGES.builder;
    write(path.join(dir, "docker-compose.yml"), compose({ project, port, url, apiImage, builderImage }));
    write(path.join(dir, "Caddyfile"), asset("Caddyfile"));
    write(path.join(dir, "init-secrets.sh"), asset("init-secrets.sh"));
    write(path.join(dir, ".gitignore"), "*\n"); // tài khoản & cấu hình máy, không đưa vào git
    console.log(c.cyan(`• Khởi động CMS (${apiImage})…`));
    await dc("up", "-d");
    if (!(await waitFor(`${url}/api/health`, 240))) throw new Error(`CMS chưa phản hồi ở ${url} — xem log: docker compose -f ${path.relative(process.cwd(), dir)}/docker-compose.yml logs api`);

    // Lần đầu website được build (1–2 phút) — chờ xong để mở ra là dùng được ngay
    console.log(c.cyan("• Chờ website sẵn sàng (lần đầu cần build)…"));
    const until = Date.now() + 600_000;
    for (;;) {
      const st = await fetch(url, { signal: AbortSignal.timeout(20_000) }).then((r) => r.status, () => 0);
      if (st && st !== 502 && st !== 503) break;
      if (Date.now() > until) throw new Error("Website chưa build xong sau 10 phút — xem log: docker compose logs builder");
      await new Promise((r) => setTimeout(r, 3000));
    }

    let cred = saved;
    const setup = await (await fetch(`${url}/api/setup`)).json();
    if (setup.needsSetup && args["no-setup"]) {
      // Tự trải nghiệm màn hình cài đặt như người dùng cuối
      const token = (await dc("exec", "-T", "api", "cat", "/data/state/setup-token")).trim();
      write(credFile, JSON.stringify({ project, port, url, apiImage, builderImage }, null, 2) + "\n");
      console.log(c.green("✓ CMS đã chạy, chưa cài đặt"));
      console.log(`  Mở ${url}/admin — mã cài đặt: ${c.bold(token)}`);
      return;
    }
    if (setup.needsSetup) {
      // Cài đặt lần đầu bằng chính màn hình cài đặt của CMS (mã cài đặt đọc trong container)
      const token = (await dc("exec", "-T", "api", "cat", "/data/state/setup-token")).trim();
      const password = crypto.randomBytes(12).toString("base64url");
      const res = await fetch(`${url}/api/setup`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, siteTitle: args.title ?? "Website thử", language: args.lang ?? "vi", timezone: "Asia/Ho_Chi_Minh",
          adminUserName: "admin", adminEmail: "admin@example.com", adminPassword: password, sampleContent: true, discourageSearchEngines: true }),
      });
      if (!res.ok) throw new Error(`Cài đặt CMS thất bại: ${res.status} ${await res.text()}`);
      cred = { url, user: "admin", password };
    }
    cred = { ...cred, project, port, url, apiImage, builderImage };
    write(credFile, JSON.stringify(cred, null, 2) + "\n");
    fs.chmodSync(credFile, 0o600);
    console.log(c.green("✓ CMS đã sẵn sàng"));
    printInfo(cred, dir);
    return;
  }
  if (!saved) throw new Error(`Chưa có môi trường ở ${dir} — chạy: npx github:Ecomcx-Jsc/ecomcx-sdk env up`);
  if (action === "down") {
    await dc("down", ...(args.purge ? ["-v"] : []));
    if (args.purge) fs.rmSync(dir, { recursive: true, force: true });
    console.log(c.green(args.purge ? "✓ Đã dừng và xoá dữ liệu" : "✓ Đã dừng (dữ liệu được giữ — `env up` để chạy lại)"));
    return;
  }
  if (action === "status") {
    const up = await waitFor(`${saved.url}/api/health`, 2);
    console.log(up ? c.green("● Đang chạy") : c.yellow("○ Đã dừng"));
    if (saved.password) printInfo(saved, dir); else console.log(`  Website     ${saved.url}  (chưa cài đặt hoặc tự cài bằng màn hình cài đặt)`);
    return;
  }
  throw new Error("Dùng: create-cms env up | status | down [--purge]");
}

function printInfo(cred, dir) {
  console.log(`  Website     ${cred.url}`);
  console.log(`  Quản trị    ${cred.url}/admin   (${cred.user} / ${cred.password})`);
  console.log(c.dim(`  Tài khoản lưu ở ${path.relative(process.cwd(), path.join(dir, "credentials.json"))} — \`create-cms dev\` tự dùng.`));
}
