# Ecomcx Nexus SDK

Bộ công cụ phát triển Theme và Plugin chuẩn cho hệ sinh thái **Ecomcx Nexus**.

## Cấu trúc Packages

```
sdk/
├── package.json               # Root monorepo (định nghĩa npx CLI entrypoint)
├── packages/
│   ├── create-cms/            # CLI tạo khung, kiểm tra, đóng gói theme & plugin
│   ├── admin-sdk/             # React SDK cho giao diện quản trị Admin của plugin
│   └── theme-sdk/             # Next.js Server Components SDK cho theme & storefront
└── .github/workflows/
    └── publish.yml            # CI/CD tự động publish lên GitHub Packages
```

---

# Sử dụng trực tiếp từ GitHub qua `npx` (Không cần cài đặt)

Sau khi push repo này lên GitHub (`github.com/Ecomcx-Jsc/ecomcx-sdk`), bất kỳ ai cũng có thể chạy ngay lập tức:

```bash
# Tạo plugin mới
npx github:Ecomcx-Jsc/ecomcx-sdk plugin "Tên Plugin"

# Tạo theme mới
npx github:Ecomcx-Jsc/ecomcx-sdk theme "Tên Theme"

# Đóng gói plugin / theme thành file .zip
npx github:Ecomcx-Jsc/ecomcx-sdk pack <đường-dẫn-thư-mục>
```

---

## 2. Hướng dẫn khởi tạo Git và đẩy lên GitHub

Mở Terminal và thực hiện các bước sau:

```bash
cd /Volumes/SSD-1/Code/ecomcx-nexus/sdk

# 1. Khởi tạo Git repository
git init

# 2. Thêm file và commit
git add .
git commit -m "feat: initial commit ecomcx-sdk monorepo"

# 3. Tạo repository mới trên GitHub (ví dụ đặt tên là: ecomcx-sdk)
# 4. Gắn remote và đẩy lên GitHub
git branch -M main
git remote add origin https://github.com/<username>/ecomcx-sdk.git
git push -u origin main
```

---

## 3. Phát hành SDK (GitHub Release)

npm không cài được thư mục con của repo git, nên `@cms/admin-sdk` và `@cms/theme-sdk` được phát hành thành tarball (JavaScript đã biên dịch + `.d.ts`) đính kèm GitHub Release. Không cần tài khoản npm hay token khi cài.

1. Tăng `version` trong `packages/*/package.json` (các gói cùng phiên bản).
2. Thử trên máy: `npm run release` (build vào `dist-release/` và cài thử vào dự án trống).
3. Tạo release trên GitHub với tag `vX.Y.Z` trùng phiên bản → workflow **Release SDK packages** tự build và đính kèm `cms-admin-sdk-X.Y.Z.tgz`, `cms-theme-sdk-X.Y.Z.tgz`.

Cài trong core/plugin:

```json
"@cms/theme-sdk": "https://github.com/Ecomcx-Jsc/ecomcx-sdk/releases/download/vX.Y.Z/cms-theme-sdk-X.Y.Z.tgz",
"@cms/admin-sdk": "https://github.com/Ecomcx-Jsc/ecomcx-sdk/releases/download/vX.Y.Z/cms-admin-sdk-X.Y.Z.tgz"
```

CLI `create-cms` không cần tarball — chạy thẳng từ tag: `npx github:Ecomcx-Jsc/ecomcx-sdk#vX.Y.Z pack`. Core ghim tag trong `scripts/cms-cli.sh`.
