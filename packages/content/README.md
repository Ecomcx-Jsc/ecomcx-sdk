# @cms/content — định dạng nội dung của CMS

Chuẩn lưu nội dung bài viết/trang của CMS, **không phụ thuộc trình soạn**. Trình soạn (hiện là TipTap/ProseMirror trong `@cms/editor`) chuyển sang chuẩn này; website (`@cms/theme-sdk`) và máy chủ (`ContentFormat.cs`) chỉ đọc chuẩn này. Đổi hay thay trình soạn không đổi dữ liệu đã lưu, website vẫn chạy.

Khác WordPress (Gutenberg lưu HTML do hàm `save()` sinh ra): CMS lưu **dữ liệu**, HTML vẽ lúc hiển thị → không có lỗi "block contains unexpected or invalid content", theme đổi giao diện khối thì bài cũ tự theo.

## Định dạng (bản 1)

```jsonc
{
  "version": 1,
  "blocks": [
    { "id": "main", "type": "richtext", "data": { "type": "doc", "content": [ /* RichNode */ ] } },
    { "id": "b2", "type": "html", "data": { "html": "<p>nội dung nhập từ hệ thống cũ</p>" } },
    { "id": "b3", "type": "ecommerce/products", "data": { "ids": [1, 2] } }   // khối của plugin
  ]
}
```

**RichNode** — cây nội dung soạn thảo:

```jsonc
{ "type": "paragraph", "attrs": { "textAlign": "center" }, "content": [
  { "type": "text", "text": "Xin chào ", "marks": [{ "type": "bold" }] },
  { "type": "text", "text": "liên kết", "marks": [{ "type": "link", "attrs": { "href": "https://…" } }] }
] }
```

- Khối lõi và thuộc tính: `CORE_NODES`, `CORE_MARKS` trong `src/schema.ts` (đoạn, tiêu đề, danh sách, danh sách việc, trích dẫn, mã, ảnh, bộ ảnh, video, âm thanh, tệp, bảng, YouTube; đậm, nghiêng, gạch chân, gạch ngang, mã, chỉ số trên/dưới, tô nền, màu chữ, liên kết).
- `null` = không có: thuộc tính null không được lưu. Thuộc tính khối lõi sai kiểu được ép (`"3"` → `3`, kẹp min/max) hoặc bỏ.
- **Khối / nút lạ được giữ nguyên** (khối của plugin, kể cả khi plugin đã tắt) — website bỏ qua khối không có renderer, nút lạ trong nội dung soạn thảo vẫn hiện phần chữ bên trong.
- Giới hạn: lồng tối đa 64 cấp, tối đa 100 000 nút một bài.
- `version` tăng khi đổi cấu trúc, kèm hàm nâng cấp (`src/migrate.ts`) — bài lưu bằng bản cũ được nâng khi đọc.

## Dùng

```ts
import { normalizeContent, contentText, wordCount, isSafeUrl } from "@cms/content";

const { doc, issues } = normalizeContent(input);   // {version, blocks}, cây TipTap thuần hoặc chuỗi HTML
contentText(doc);                                  // chữ thuần (tìm kiếm, tóm tắt)
```

## Hợp đồng

`fixtures/*.json` — mỗi file `{ name, note, input, expected }`. Ba bên cùng chạy bộ này:

| Bên | Test |
|---|---|
| `@cms/content` | `normalizeContent(input) == expected`, chuẩn hoá lần hai không đổi |
| Máy chủ (core) | `ContentFormatTests` — cùng fixture (bản chép ở `backend/tests/Cms.Tests/ContentFixtures/`) |
| Website (`@cms/theme-sdk`) | vẽ mỗi fixture ra đúng HTML đã duyệt (`test/snapshots/`) |
| Trình soạn (`@cms/editor`) | mở fixture rồi xuất lại → chuẩn hoá ra đúng `expected` |

Đổi quy tắc: sửa `src/` + `ContentFormat.cs` + fixture cùng lúc. Thay trình soạn: chỉ cần qua bộ test của trình soạn.

`node scripts/test.mjs` (gốc repo sdk) chạy test mọi gói.
