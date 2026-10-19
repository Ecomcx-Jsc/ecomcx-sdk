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

## 1. Sử dụng trực tiếp từ GitHub qua `npx` (Không cần cài đặt)

Sau khi push repo này lên GitHub (ví dụ: `github.com/duxbo/ecomcx-sdk`), bất kỳ ai cũng có thể chạy ngay lập tức:

```bash
# Tạo plugin mới
npx github:duxbo/ecomcx-sdk plugin "Tên Plugin"

# Tạo theme mới
npx github:duxbo/ecomcx-sdk theme "Tên Theme"

# Đóng gói plugin / theme thành file .zip
npx github:duxbo/ecomcx-sdk pack <đường-dẫn-thư-mục>
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

## 3. Hướng dẫn Publish lên GitHub Packages (`npm.pkg.github.com`)

GitHub Packages cho phép bạn lưu trữ các gói npm ngay trên GitHub.

### Cách A: Tự động qua GitHub Actions (Khuyên dùng)
Repo đã được cấu hình sẵn workflow `.github/workflows/publish.yml`.
1. Vào repository trên GitHub > **Releases** > **Draft a new release**.
2. Nhập tag (ví dụ `v1.0.0`) và bấm **Publish release**.
3. GitHub Actions sẽ tự động biên dịch và publish các package lên GitHub Packages.

### Cách B: Publish thủ công từ máy tính
1. Đăng nhập vào GitHub Packages:
   ```bash
   npm login --registry=https://npm.pkg.github.com
   # Nhập username GitHub và Personal Access Token (PAT) có quyền write:packages
   ```
2. Đổi scope trong `package.json` của từng package theo tên username GitHub của bạn (ví dụ `@duxbo/admin-sdk`, `@duxbo/theme-sdk`, `@duxbo/create-cms`).
3. Chạy lệnh publish:
   ```bash
   npm publish --workspaces --access public
   ```
