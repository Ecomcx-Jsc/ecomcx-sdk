import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { BlockProps, ShortcodeProps, Site } from "../src/types";
import { renderContent, type RenderContext } from "../src/rich";

// Hợp đồng của renderer: mỗi fixture của @cms/content vẽ ra đúng HTML đã duyệt (snapshots/). Đổi renderer có chủ đích:
// UPDATE_SNAPSHOTS=1 node scripts/test.mjs theme-sdk, rồi xem kỹ diff.
const root = process.env.SDK_ROOT!;
const fixtures = path.join(root, "packages", "content", "fixtures");
const snapshots = path.join(root, "packages", "theme-sdk", "test", "snapshots");
const site = { name: "Test", url: "https://example.com", locale: "vi" } as unknown as Site;

function Callout({ data, children }: BlockProps) { return <aside className={`callout callout-${data.tone ?? "info"}`}>{children}</aside>; }
function ProductCard({ data }: BlockProps) { return <div className="product">#{data.productId}</div>; }
function Products({ data }: BlockProps) { return <ul className="products">{(data.ids as number[]).map((id) => <li key={id}>{id}</li>)}</ul>; }
function Hello({ attrs }: ShortcodeProps) { return <b>hello {attrs.name}</b>; }

const blocks: Record<string, (p: BlockProps) => any> = { callout: Callout, "product-card": ProductCard, "ecommerce/products": Products };
const ctx = (extra: Partial<RenderContext> = {}): RenderContext => ({
  site,
  resolve: { shortcode: async (n) => (n === "hello" ? Hello : null), block: async (t) => blocks[t] ?? null },
  ...extra,
});
const html = async (content: unknown, c = ctx()) => renderToStaticMarkup(<>{await renderContent(content, c)}</>);

for (const file of readdirSync(fixtures).filter((f) => f.endsWith(".json")).sort()) {
  const f = JSON.parse(readFileSync(path.join(fixtures, file), "utf8"));
  test(`render ${f.name}`, async () => {
    const out = await html(f.input);
    const snap = path.join(snapshots, `${f.name}.html`);
    if (process.env.UPDATE_SNAPSHOTS || !existsSync(snap)) writeFileSync(snap, out + "\n");
    assert.equal(out + "\n", readFileSync(snap, "utf8"));
    // Vẽ đầu vào thô và bản đã chuẩn hoá cho cùng kết quả
    assert.equal(await html(f.expected), out);
  });
}

test("nút của plugin dùng renderer khối, có nội dung con", async () => {
  const out = await html({ type: "doc", content: [{ type: "callout", attrs: { tone: "warning" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Chú ý" }] }] }] });
  assert.equal(out, '<aside class="callout callout-warning"><p>Chú ý</p></aside>');
});

test("plugin đã tắt: nút giữ phần chữ bên trong, khối cấp cao nhất bỏ qua", async () => {
  const off = ctx({ resolve: { shortcode: async () => null, block: async () => null } });
  const out = await html({ version: 1, blocks: [
    { type: "richtext", data: { type: "doc", content: [{ type: "callout", content: [{ type: "paragraph", content: [{ type: "text", text: "Vẫn đọc được" }] }] }, { type: "product-card", attrs: { productId: 1 } }] } },
    { type: "ecommerce/products", data: { ids: [1] } }] }, off);
  assert.equal(out, "<p>Vẫn đọc được</p>");
});

test("shortcode trong đoạn văn", async () => {
  assert.equal(await html({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: '[hello name="An"]' }] }] }), "<b>hello An</b>");
});

test("URL độc bị vô hiệu ở mọi chỗ", async () => {
  const bad = "javascript:alert(1)";
  const out = await html({ type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: bad } }] }] },
    { type: "image", attrs: { src: bad } }, { type: "video", attrs: { src: bad, poster: bad } }, { type: "file", attrs: { src: bad, name: "f" } },
    { type: "gallery", attrs: { images: [{ src: bad, full: bad }] } }] });
  assert.ok(!out.toLowerCase().includes("javascript:"), out);
});

test("khối lỗi được bọc bởi boundary", async () => {
  const names: string[] = [];
  await html({ type: "doc", content: [{ type: "callout" }] }, ctx({ boundary: (name, key, el) => { names.push(name); return <section key={key}>{el}</section>; } }));
  assert.deepEqual(names, ["Block callout"]);
});
