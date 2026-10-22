import fs from "node:fs";
import path from "node:path";
import { c, pascal, slugify, write, findCmsRepo } from "./util.mjs";

export function scaffoldTheme(name, { parent, dir } = {}) {
  const slug = slugify(name);
  const root = path.resolve(dir ?? slug);
  if (fs.existsSync(root) && fs.readdirSync(root).length) throw new Error(`Thư mục ${root} đã tồn tại và không rỗng`);

  write(path.join(root, "theme.json"), JSON.stringify({
    name, slug, version: "1.0.0", author: "", description: `Theme ${name}`,
    ...(parent ? { parent } : {}),
    requires: { cms: ">=1.0.0 <2.0.0" },
    menuLocations: { primary: "Menu chính", footer: "Menu chân trang" },
    widgetAreas: { sidebar: "Sidebar" },
    supports: ["post-thumbnails", "custom-logo", "comments", "menus", "widgets"],
    settings: [
      { key: "primaryColor", type: "color", label: "Màu chủ đạo", default: "#0ea5e9" },
      { key: "footerText", type: "textarea", label: "Chữ chân trang", default: "" },
    ],
  }, null, 2) + "\n");

  write(path.join(root, "package.json"), JSON.stringify({
    name: `cms-theme-${slug}`, private: true, version: "1.0.0",
    description: "Thêm dependencies npm mà theme cần vào đây — Builder sẽ tự cài khi build.",
    dependencies: {},
    devDependencies: {
      "@cms/theme-sdk": "https://github.com/Ecomcx-Jsc/ecomcx-sdk/releases/latest/download/cms-theme-sdk.tgz",
      "@types/react": "^19",
      typescript: "5.9.3",
    },
  }, null, 2) + "\n");

  write(path.join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", module: "esnext", moduleResolution: "bundler", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true },
    include: ["**/*.ts", "**/*.tsx"],
  }, null, 2) + "\n");

  if (!parent) {
    write(path.join(root, "layout.tsx"), `
import "./styles.css";
import type { CSSProperties } from "react";
import { Menu, setting, type LayoutProps } from "@cms/theme-sdk";

/** Khung chung của mọi trang (header, footer). Tương đương header.php + footer.php. */
export default function Layout({ site, settings, children }: LayoutProps) {
  return (
    <div className="site" style={{ "--primary": setting(settings, "primaryColor", "#0ea5e9") } as CSSProperties}>
      <header className="site-header">
        <a href="/" className="site-title">{site.title}</a>
        <Menu location="primary" className="primary-nav" />
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">{setting(settings, "footerText", "") || \`© \${new Date().getFullYear()} \${site.title}\`}</footer>
    </div>
  );
}
`);
    write(path.join(root, "templates", "index.tsx"), `
import { Pagination, PostContent, type TemplateProps } from "@cms/theme-sdk";

/** Template dự phòng cuối cùng (giống index.php). */
export default function Index({ data }: TemplateProps) {
  if (data.post) {
    return (
      <article>
        <h1>{data.post.title}</h1>
        <PostContent post={data.post} />
      </article>
    );
  }
  return (
    <section>
      <h1>{data.title}</h1>
      {(data.posts ?? []).map((p) => (
        <article key={p.id}>
          <h2><a href={p.link}>{p.title}</a></h2>
          <p>{p.excerpt}</p>
        </article>
      ))}
      <Pagination data={data} />
    </section>
  );
}
`);
    write(path.join(root, "templates", "single.tsx"), `
import { Comments, FeaturedImage, PostContent, PostDate, type TemplateProps } from "@cms/theme-sdk";

/** Một bài viết (giống single.php). Tạo single-{postType}.tsx để riêng cho từng post type. */
export default function Single({ data, site }: TemplateProps) {
  const post = data.post!;
  return (
    <article>
      <h1>{post.title}</h1>
      <p><PostDate post={post} site={site} /></p>
      <FeaturedImage media={post.featuredMedia} />
      <PostContent post={post} />
      <Comments post={post} />
    </article>
  );
}
`);
    write(path.join(root, "templates", "404.tsx"), `
import { SearchForm, type TemplateProps } from "@cms/theme-sdk";

export default function NotFound(_: TemplateProps) {
  return (
    <section>
      <h1>Không tìm thấy trang</h1>
      <SearchForm />
    </section>
  );
}
`);
    write(path.join(root, "styles.css"), `
body { margin: 0; font-family: system-ui, sans-serif; line-height: 1.6; }
a { color: var(--primary); }
.site-header, .site-main, .site-footer { max-width: 960px; margin: 0 auto; padding: 16px; }
.site-header { display: flex; align-items: center; justify-content: space-between; }
.site-title { font-weight: 700; font-size: 1.25rem; color: inherit; text-decoration: none; }
.primary-nav .menu { list-style: none; display: flex; gap: 16px; margin: 0; padding: 0; }
`);
  } else {
    write(path.join(root, "templates", "home.tsx"), `
import type { TemplateProps } from "@cms/theme-sdk";

/** Child theme: chỉ ghi đè template cần thiết, phần còn lại lấy từ theme cha "${parent}". */
export default function Home({ data }: TemplateProps) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>Trang chủ của ${name}</h1>
      <ul>{(data.posts ?? []).map((p) => <li key={p.id}><a href={p.link}>{p.title}</a></li>)}</ul>
    </div>
  );
}
`);
  }

  write(path.join(root, "extend.tsx"), `
import { definePlugin } from "@cms/theme-sdk";

/**
 * Theme có thể đăng ký shortcode, widget, slot, filter.
 * Ví dụ shortcode: gõ [xin-chao ten="Lan"] trong nội dung bài viết.
 */
export default definePlugin({
  shortcodes: {
    "xin-chao": ({ attrs }) => <strong>Xin chào {attrs.ten ?? "bạn"}!</strong>,
  },
});
`);
  write(path.join(root, "README.md"), `# ${name}\n\nTheme cho CMS.\n\n- \`npx github:Ecomcx-Jsc/ecomcx-sdk validate\` — kiểm tra theme\n- \`npx github:Ecomcx-Jsc/ecomcx-sdk pack\` — đóng gói thành zip để upload trong Giao diện › Thêm mới\n- \`npx github:Ecomcx-Jsc/ecomcx-sdk dev --password ...\` — tự đóng gói và cài lên CMS local mỗi khi sửa file\n`);
  return { root, slug };
}

/**
 * Plugin một file C# (CMS ≥ 1.7.0 tự biên dịch khi cài — không cần .NET SDK, csproj, NuGet):
 * bảng dữ liệu EF + trang quản trị tự sinh + form trên website ([cms-form]) + hook.
 */
export function scaffoldSimplePlugin(name, { dir, tests = false } = {}) {
  const slug = slugify(name);
  const cls = pascal(name) || "MyPlugin";
  const root = path.resolve(dir ?? slug);
  if (fs.existsSync(root) && fs.readdirSync(root).length) throw new Error(`Thư mục ${root} đã tồn tại và không rỗng`);
  write(path.join(root, "plugin.json"), JSON.stringify({ name, slug, version: "1.0.0", author: "", description: `Plugin ${name}`, requires: { cms: ">=1.7.0 <2.0.0" }, backend: `${cls}.cs` }, null, 2) + "\n");
  write(path.join(root, `${cls}.cs`), `namespace ${cls};

/// Bảng dữ liệu: CMS tự tạo bảng plg_${slug.replace(/-/g, "_")}__entries khi bật plugin, tự thêm cột khi bạn thêm thuộc tính.
[PluginTable("entries")]
[AdminList("${name}", Icon = "inbox", Columns = "Name,Email,CreatedAt", Search = "Name,Email,Message")]   // trang quản trị tự sinh
[PublicCreate(PerMinute = 5, SuccessMessage = "Cảm ơn bạn!")]                                          // form trên website: [cms-form plugin="${slug}" table="entries"]
public class Entry
{
    public long Id { get; set; }
    [Required, MaxLength(100), Display(Name = "Họ tên")] public string Name { get; set; } = "";
    [Required, EmailAddress, Display(Name = "Email")] public string Email { get; set; } = "";
    [MaxLength(2000), Display(Name = "Lời nhắn")] public string? Message { get; set; }
    [AdminOnly, Display(Name = "Đã xử lý")] public bool Done { get; set; }        // chỉ quản trị viên đặt
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class ${cls}Plugin : CmsPlugin
{
    public override void Register(IPluginContext ctx)
    {
        ctx.Data.Table<Entry>();

        // Có bản ghi mới từ website → ghi log (đổi thành gửi email, gọi API… tuỳ ý)
        ctx.Hooks.On<PluginDataEvent>("${slug}:entries.created", (e, h) =>
        {
            Console.WriteLine($"[${slug}] mới: {e.Item["name"]} <{e.Item["email"]}>");
            return Task.CompletedTask;
        });

        // Endpoint riêng (tuỳ chọn): GET /api/plugins/${slug}/stats
        ctx.Endpoints.Map(r => r.MapGet("/stats", async (IPluginDb db) =>
            Results.Ok(new { total = await db.Set<Entry>().CountAsync(), done = await db.Set<Entry>().CountAsync(x => x.Done) })));
    }
}
`);
  write(path.join(root, "README.md"), `# ${name}

Plugin một file — CMS tự biên dịch \`${cls}.cs\` khi cài (CMS ≥ 1.7.0).

- \`npx github:Ecomcx-Jsc/ecomcx-sdk dev\` — cài lên CMS thử, sửa file là cài lại
- Trang quản trị: menu **${name}** · Form trên website: \`[cms-form plugin="${slug}" table="entries"]\`
- Gợi ý code trong VS Code (không bắt buộc): cài .NET SDK + gói \`Cms.Plugin.Sdk\`
`);
  if (tests) scaffoldTests(root, cls, slug);
  return { root, slug };
}

/** Dự án test xUnit dùng Cms.Plugin.Testing — chạy bằng `create-cms test` (cần .NET SDK). */
function scaffoldTests(root, cls, slug) {
  write(path.join(root, "tests", `${cls}.Tests.csproj`), `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Cms.Plugin.Testing" Version="1.7.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.1.4" />
  </ItemGroup>
</Project>
`);
  write(path.join(root, "tests", `${cls}Tests.cs`), `using System.Net;
using System.Net.Http.Json;
using Cms.Plugin.Testing;
using Xunit;

/// Chạy: create-cms env up (một lần) rồi create-cms test — gói plugin được cài + bật trên CMS thử.
public class ${cls}Tests : PluginTest
{
    [Fact]
    public async Task Khach_gui_form_duoc_luu()
    {
        var email = $"t{Guid.NewGuid():N}@test.vn";
        var res = await Anonymous.PostAsJsonAsync(Anonymous.Plugin("/data/entries"), new { name = "An", email, message = "Xin chào", done = true });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var row = Assert.Single(await Rows("entries", search: email));
        Assert.False(row["done"]!.GetValue<bool>());   // [AdminOnly]: khách không đặt được
    }

    [Fact]
    public async Task Du_lieu_sai_bi_tu_choi()
    {
        var res = await Anonymous.PostAsJsonAsync(Anonymous.Plugin("/data/entries"), new { name = "", email = "sai" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, res.StatusCode);
    }

    [Fact]
    public async Task Tac_gia_khong_xem_duoc_du_lieu()
    {
        var author = await As("author");
        Assert.Equal(HttpStatusCode.Forbidden, (await author.GetAsync($"/api/admin/plugin-data/{Slug}/entries")).StatusCode);
    }
}
`);
}

export function scaffoldPlugin(name, { backend = true, admin = true, frontend = true, dir } = {}) {
  const slug = slugify(name);
  const cls = pascal(name) || "MyPlugin";
  const root = path.resolve(dir ?? slug);
  if (fs.existsSync(root) && fs.readdirSync(root).length) throw new Error(`Thư mục ${root} đã tồn tại và không rỗng`);

  const manifest = { name, slug, version: "1.0.0", author: "", description: `Plugin ${name}`, requires: { cms: ">=1.7.0 <2.0.0" } };
  if (backend) manifest.backend = { assembly: `backend/${cls}.dll`, entry: `${cls}.${cls}Plugin` };
  if (admin) manifest.admin = { entry: "admin/index.js" };
  if (frontend) manifest.frontend = { entry: "frontend/index.tsx" };
  write(path.join(root, "plugin.json"), JSON.stringify(manifest, null, 2) + "\n");

  // Bản dịch theo khoá (ICU MessageFormat), namespace = slug: admin dùng createT("${slug}"), backend dùng Text.T("${slug}:khoá")
  const messages = {
    vi: { "menu.title": name, "page.description": "Trang quản trị của plugin.", "settings.title": "Cài đặt", "settings.greeting": "Lời chào",
      "settings.saved": "Đã lưu", "settings.save": "Lưu", "metabox.note": "Ghi chú nội bộ", "metabox.title": name },
    en: { "menu.title": name, "page.description": "The plugin's admin page.", "settings.title": "Settings", "settings.greeting": "Greeting",
      "settings.saved": "Saved", "settings.save": "Save", "metabox.note": "Internal note", "metabox.title": name },
  };
  for (const [code, dict] of Object.entries(messages)) write(path.join(root, "locales", `${code}.json`), JSON.stringify(dict, null, 2) + "\n");

  if (backend) {
    const repo = findCmsRepo(root);
    // Nguồn Cms.Plugin.Sdk: nuget.org; thêm feed local khi ở trong repo CMS hoặc khi đặt CMS_NUGET_FEED (thư mục chứa .nupkg)
    const feed = process.env.CMS_NUGET_FEED ? path.resolve(process.env.CMS_NUGET_FEED) : repo ? path.join(repo, "sdk", "nuget") : null;
    write(path.join(root, "backend", `${cls}.csproj`), `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>${cls}</RootNamespace>
    <AssemblyName>${cls}</AssemblyName>
    <!-- Plugin được nạp vào CMS: không tự chứa runtime, dùng chung SDK của CMS -->
    <EnableDynamicLoading>true</EnableDynamicLoading>
  </PropertyGroup>
  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
    <PackageReference Include="Cms.Plugin.Sdk" Version="1.7.0">
      <Private>false</Private>
      <ExcludeAssets>runtime</ExcludeAssets>
    </PackageReference>
  </ItemGroup>
</Project>
`);
    if (feed) write(path.join(root, "backend", "nuget.config"), `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="cms-local" value="${feed}" />
  </packageSources>
</configuration>
`);
    write(path.join(root, "backend", `${cls}Plugin.cs`), `
using System.Data.Common;
using Cms.Plugin.Sdk;
using Cms.Plugin.Sdk.Contracts;
using Cms.Plugin.Sdk.Hooks;
using Cms.Plugin.Sdk.Localization;
using Cms.Plugin.Sdk.Registry;
using Cms.Plugin.Sdk.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace ${cls};

public sealed class ${cls}Plugin : CmsPlugin
{
    public override void Register(IPluginContext ctx)
    {
        // Bảng riêng của plugin (chạy một lần khi kích hoạt).
        ctx.Migrations.Add("001_create_log",
            "create table if not exists ${slug.replace(/-/g, "_")}_log (id bigserial primary key, message text not null, created_at timestamptz not null default now())",
            "drop table if exists ${slug.replace(/-/g, "_")}_log");

        // Chạy sau khi bài được lưu
        ctx.Hooks.On<PostEvent>(HookNames.PostPublished, async (e, h) =>
        {
            var db = h.Services.GetRequiredService<IDbConnectionFactory>();
            await using var conn = await db.OpenAsync(h.CancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "insert into ${slug.replace(/-/g, "_")}_log (message) values (@m)";
            var p = cmd.CreateParameter(); p.ParameterName = "m"; p.Value = $"Đã đăng: {e.Post.Title}"; cmd.Parameters.Add(p);
            await cmd.ExecuteNonQueryAsync(h.CancellationToken);
        });

        // Filter: thêm dữ liệu vào API bài viết (frontend đọc ở post.extra)
        ctx.Filters.Add<PostDto>(FilterNames.ApiPostResponse, post =>
        {
            post.Extra["${slug}"] = new System.Text.Json.Nodes.JsonObject { ["words"] = post.Excerpt.Split(' ').Length };
            return post;
        });

        // Trang settings tự sinh trong admin. Nhãn là khoá dịch trong locales/*.json (CMS dịch theo ngôn ngữ người dùng)
        ctx.Settings.Register("general", Text.T("${slug}:menu.title"), [
            new FieldDefinition("greeting", "text", Text.T("${slug}:settings.greeting"), "Xin chào!"),
        ]);
        ctx.Admin.AddMenu(new AdminMenuItem("${slug}", Text.T("${slug}:menu.title"), "/${slug}", "manage_options", "puzzle"));

        // Endpoint: GET /api/plugins/${slug}/hello
        ctx.Endpoints.Map(r => r.MapGet("/hello", async (IPluginSettings settings) =>
            Results.Ok(new { message = (await settings.GetAsync("${slug}", "general"))["greeting"]?.ToString() })));
    }
}
`);
  }

  if (admin) {
    write(path.join(root, "admin", "src", "index.tsx"), `
import { useState } from "react";
import { Button, Card, Field, Input, PageHeader, api, createT, notify, registerMetaBox, registerPage, useApi } from "@cms/admin-sdk";

/** Dịch theo khoá trong locales/*.json của plugin (namespace "${slug}"). */
const t = createT("${slug}");

/** Trang admin — đường dẫn khớp với ctx.Admin.AddMenu(... "/${slug}" ...) ở backend. */
function SettingsPage() {
  const { data, reload } = useApi<{ greeting: string }>("/admin/settings/plugins/${slug}/general");
  const [greeting, setGreeting] = useState<string | null>(null);
  const value = greeting ?? data?.greeting ?? "";
  return (
    <>
      <PageHeader title={t("menu.title")} description={t("page.description")} />
      <Card title={t("settings.title")}>
        <Field label={t("settings.greeting")}><Input value={value} onChange={(e) => setGreeting(e.target.value)} /></Field>
        <Button variant="primary" onClick={async () => {
          await api.put("/admin/settings/plugins/${slug}/general", { greeting: value });
          notify.success(t("settings.saved"));
          reload();
        }}>{t("settings.save")}</Button>
      </Card>
    </>
  );
}

registerPage({ path: "/${slug}", title: t("menu.title"), component: SettingsPage });

/** Meta box trong trang sửa bài — giá trị lưu vào post.meta khi bấm Lưu. */
registerMetaBox({
  id: "${slug}-note",
  title: t("metabox.title"),
  postTypes: ["post"],
  context: "side",
  component: ({ meta, setMeta }) => (
    <Field label={t("metabox.note")}>
      <Input value={meta["${slug}_note"] ?? ""} onChange={(e) => setMeta("${slug}_note", e.target.value)} />
    </Field>
  ),
});
`);
  }

  if (frontend) {
    write(path.join(root, "frontend", "index.tsx"), `
import { definePlugin } from "@cms/theme-sdk";

/** Phần hiển thị ngoài website: shortcode, widget, slot, filter. */
export default definePlugin({
  shortcodes: {
    // Gõ [${slug}] trong nội dung bài viết
    "${slug}": ({ post }) => <div className="${slug}-box">Xin chào từ plugin ${name}{post ? \` — bài: \${post.title}\` : ""}</div>,
  },
  filters: {
    "document.metadata": (meta) => ({ ...meta, extra: { ...meta.extra, "generator-plugin": "${slug}" } }),
  },
});
`);
  }

  if (admin || frontend) {
    const devDeps = { "@types/react": "^19", typescript: "5.9.3" };
    if (admin) devDeps["@cms/admin-sdk"] = "https://github.com/Ecomcx-Jsc/ecomcx-sdk/releases/latest/download/cms-admin-sdk.tgz";
    if (frontend) devDeps["@cms/theme-sdk"] = "https://github.com/Ecomcx-Jsc/ecomcx-sdk/releases/latest/download/cms-theme-sdk.tgz";
    write(path.join(root, "package.json"), JSON.stringify({
      name: `cms-plugin-${slug}`, private: true, version: "1.0.0",
      description: `Dependencies cho giao diện admin/frontend của plugin ${name}`,
      dependencies: {},
      devDependencies: devDeps,
    }, null, 2) + "\n");
    write(path.join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "esnext", moduleResolution: "bundler", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true },
      include: ["admin/src/**/*", "frontend/**/*"],
    }, null, 2) + "\n");
  }

  write(path.join(root, "README.md"), `# ${name}\n\nPlugin cho CMS.\n\n- \`backend/\` — C# (Cms.Plugin.Sdk): hook, filter, migration, endpoint, settings\n- \`admin/src/\` — React (@cms/admin-sdk): trang quản trị, meta box\n- \`frontend/\` — React (@cms/theme-sdk): shortcode, widget, slot, filter\n- \`locales/\` — bản dịch theo khoá (ICU), namespace \`${slug}\`: \`createT("${slug}")\` ở admin, \`Text.T("${slug}:khoá")\` ở backend\n\nLệnh:\n\n- \`npx github:Ecomcx-Jsc/ecomcx-sdk validate\`\n- \`npx github:Ecomcx-Jsc/ecomcx-sdk pack\` → \`dist/${slug}-1.0.0.zip\`\n- \`npx github:Ecomcx-Jsc/ecomcx-sdk deploy --password ... --activate\`\n- \`npx github:Ecomcx-Jsc/ecomcx-sdk dev --password ...\` (tự deploy khi sửa file)\n`);
  return { root, slug };
}
