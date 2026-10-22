import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { contentText, isSafeUrl, normalizeContent, wordCount } from "../src";

const dir = path.join(process.env.SDK_ROOT!, "packages", "content", "fixtures");
const fixtures = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));

for (const f of fixtures) {
  test(`fixture ${f.name}: chuẩn hoá đúng như hợp đồng`, () => {
    assert.deepEqual(normalizeContent(f.input).doc, f.expected);
  });
  test(`fixture ${f.name}: chuẩn hoá hai lần không đổi`, () => {
    const { doc, issues } = normalizeContent(f.expected);
    assert.deepEqual(doc, f.expected);
    assert.deepEqual(issues, []);
  });
}

test("giới hạn độ sâu: nội dung lồng quá sâu bị cắt, không treo", () => {
  let node: any = { type: "paragraph", content: [{ type: "text", text: "đáy" }] };
  for (let i = 0; i < 500; i++) node = { type: "blockquote", content: [node] };
  const { doc, issues } = normalizeContent({ type: "doc", content: [node] });
  let depth = 0;
  for (let n: any = doc.blocks[0].data; n?.content; n = n.content[0]) depth++;
  assert.ok(depth <= 65, `depth ${depth}`);
  assert.ok(issues.some((i) => i.includes("deeper")));
});

test("giới hạn số nút", () => {
  const content = Array.from({ length: 50 }, (_, i) => ({ type: "paragraph", content: [{ type: "text", text: String(i) }] }));
  const { doc, issues } = normalizeContent({ type: "doc", content }, { maxNodes: 21 });
  assert.equal(doc.blocks[0].data.content.length, 10); // doc + 10 × (đoạn + chữ) = 21
  assert.ok(issues.some((i) => i.includes("truncated")));
});

test("khối plugin khai báo thuộc tính (defineBlock) được ép kiểu như khối lõi", () => {
  const { doc } = normalizeContent({ type: "doc", content: [{ type: "callout", attrs: { tone: "loud", count: "2" } }] },
    { nodes: { callout: { attrs: { tone: { type: "string", enum: ["info", "warning"] }, count: { type: "integer" } } } } });
  assert.deepEqual(doc.blocks[0].data.content[0], { type: "callout", attrs: { count: 2 } });
});

test("chữ thuần và đếm từ", () => {
  const all = fixtures.find((f) => f.name === "all-core-nodes")!.expected;
  const text = contentText(all);
  assert.ok(text.startsWith("Tiêu đề\nChữ đậm và liên kết\ndòng mới"), text);
  assert.ok(wordCount(all) > 20);
});

test("URL an toàn: cùng quy tắc với máy chủ", () => {
  for (const ok of ["https://a.vn", "http://a", "/x", "#a", "?q=1", "mailto:a@b.vn", "tel:+84", "data:image/png;base64,AA", "a/b:c", ""]) assert.ok(isSafeUrl(ok), ok);
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:x", "java\tscript:x", " javascript:x", "vbscript:x", "data:text/html,x", "data:image/svg+xml,x", "file:///etc"]) assert.ok(!isSafeUrl(bad), bad);
});
