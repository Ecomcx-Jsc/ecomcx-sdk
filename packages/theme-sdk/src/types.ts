import type { ComponentType, ReactNode } from "react";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export type JsonObject = { [k: string]: JsonValue };

export interface Author { id: number; name: string; slug: string; avatarUrl?: string | null; bio?: string | null }

export interface MediaSize { url: string; width: number; height: number; webpUrl?: string | null }
export interface Media {
  id: number; url: string; fileName: string; mimeType: string; size: number;
  width?: number | null; height?: number | null; alt: string; caption: string;
  sizes: Record<string, MediaSize>;
  /** Bản WebP của ảnh gốc. */
  webpUrl?: string | null;
  /** Điểm lấy nét 0–1 (object-position). */
  focalX?: number | null; focalY?: number | null;
}

export interface Term {
  id: number; taxonomy: string; name: string; slug: string; locale: string; description: string;
  parentId?: number | null; count: number; link: string; meta: JsonObject;
  /** Dữ liệu plugin thêm vào qua filter api.term.response (vd extra.seo). */
  extra?: JsonObject;
}

/** Một block nội dung. Hiện tại core có: richtext (TipTap JSON) và html. */
export interface Block { id?: string; type: string; data: any }
export interface PostContentDoc { version: number; blocks: Block[] }

export interface TranslationRef { locale: string; id: number; title: string; status: string; link: string }

export interface Post {
  id: number; type: string; title: string; slug: string; status: string;
  /** Mã ngôn ngữ của bài, vd "vi". */
  locale: string;
  /** Bản dịch đã đăng ở ngôn ngữ khác. */
  translations: TranslationRef[];
  content?: PostContentDoc | null; excerpt: string;
  authorId?: number | null; author?: Author | null;
  parentId?: number | null; menuOrder: number; template?: string | null;
  featuredMedia?: Media | null; commentStatus: string; commentCount: number;
  /** Bài ghim / nổi bật. */
  sticky: boolean;
  /** Bài có mật khẩu: chưa mở khoá thì content = null, excerpt rỗng — PostContent tự hiện form nhập mật khẩu. */
  passwordProtected?: boolean;
  publishedAt?: string | null; createdAt: string; updatedAt: string;
  link: string; meta: JsonObject; terms: Record<string, Term[]>;
  /** Dữ liệu plugin thêm vào qua filter api.post.response (vd extra.seo). */
  extra: JsonObject;
}

export interface Language { code: string; name: string; isDefault: boolean; flag?: string | null }

export interface Site {
  title: string; tagline: string; url: string; language: string; timezone: string; dateFormat: string;
  /** Ngôn ngữ của request hiện tại. */
  locale: string; defaultLocale: string; languages: Language[];
  postsPerPage: number; showOnFront: "posts" | "page"; pageOnFront?: number | null; pageForPosts?: number | null;
  activeTheme: string; themeSettings: JsonObject; activePlugins: string[];
  menuLocations: Record<string, number>; extra: JsonObject;
  /** false = website yêu cầu máy tìm kiếm không index. */
  indexable?: boolean;
  /** Website chưa qua màn hình cài đặt lần đầu. */
  setupRequired?: boolean;
}

export interface MenuItem {
  id: number; parentId?: number | null; title: string; url: string; kind: string;
  objectId?: number | null; target?: string | null; cssClass?: string | null; order: number; children: MenuItem[];
}
export interface Menu { id: number; name: string; slug: string; items: MenuItem[]; locations: string[] }

export interface WidgetInstance { id: number; area: string; type: string; title: string; settings: any; order: number }

export interface Comment {
  id: number; postId: number; parentId?: number | null; authorName: string; authorUrl?: string | null;
  content: string; status: string; createdAt: string; replies: Comment[];
  /** Ảnh đại diện (ảnh của thành viên hoặc Gravatar); null khi site tắt hiển thị avatar. */
  avatarUrl?: string | null;
}

/** Một trang bình luận gốc (kèm trả lời). total = số bình luận gốc, count = tổng kể cả trả lời. */
export interface CommentPage { items: Comment[]; total: number; count: number; page: number; totalPages: number }

export type ResolveKind =
  | "front-page" | "home" | "single" | "page" | "category" | "tag" | "taxonomy" | "author" | "date" | "archive" | "search" | "route" | "404" | "redirect";

export interface ResolveResult {
  kind: ResolveKind;
  templates: string[];
  title: string;
  locale: string;
  /** Trang tương ứng ở các ngôn ngữ (dùng cho hreflang, nút chuyển ngôn ngữ). */
  alternates: Array<{ locale: string; link: string }>;
  post?: Post | null;
  posts?: Post[] | null;
  term?: Term | null;
  author?: Author | null;
  postType?: string | null;
  search?: string | null;
  page: number; totalPages: number; total: number; basePath: string;
  redirect?: { location: string; statusCode: number } | null;
  isPreview?: boolean;
  /** Trang ảo (kind = "route") do core/plugin đăng ký: /login, /account/orders/12 → { name: "account", rest: "orders/12" }. */
  route?: { name: string; path: string; rest: string; owner: string } | null;
  /** Không cho máy tìm kiếm index. */
  noIndex?: boolean;
}

/** Props mà mọi template của theme nhận được. */
export interface TemplateProps {
  data: ResolveResult;
  site: Site;
  settings: JsonObject;
  /** Tên template đã được chọn (vd "single"). */
  template: string;
}

export interface LayoutProps { site: Site; settings: JsonObject; children: ReactNode }

export interface ThemeManifest {
  name: string; slug: string; version: string; author?: string; description?: string; parent?: string | null;
  menuLocations?: Record<string, string>; widgetAreas?: Record<string, string>; supports?: string[];
  settings?: Array<{ key: string; type: string; label: string; default?: JsonValue; options?: string[]; section?: string; help?: string }>;
  /** Cỡ ảnh riêng của theme (giống add_image_size): { "card": { "width": 600, "height": 400, "crop": true } }. */
  imageSizes?: Record<string, { width: number; height?: number; crop?: boolean }>;
  pageTemplates?: Record<string, string>;
  [key: string]: unknown;
}

type Loader<T> = () => Promise<{ default: T }>;

export interface ThemeEntry {
  manifest: ThemeManifest;
  layout?: Loader<ComponentType<LayoutProps>>;
  templates: Record<string, Loader<ComponentType<TemplateProps>>>;
  /** Theme cũng có thể đăng ký shortcode, widget, slot, filter. */
  extend?: Loader<PluginDefinition>;
  /** Bản dịch chữ của theme: locales/{code}.json */
  locales?: Record<string, Loader<Record<string, string>>>;
}

export type PluginLoader = Loader<PluginDefinition>;

// ---------------------------------------------------------------------------
// Plugin frontend
// ---------------------------------------------------------------------------

export interface ShortcodeProps { attrs: Record<string, string>; content?: string; site: Site; post?: Post | null }
export interface WidgetProps<S = any> { widget: WidgetInstance; settings: S; site: Site }
export interface SlotProps { site: Site; data?: ResolveResult | null }
export interface BlockProps<D = any> { block: Block; data: D; site: Site; post?: Post | null }

export interface DocumentMetadata {
  title: string;
  description?: string;
  canonical?: string;
  /** Bản dịch của trang: { vi: "/chao-mung", en: "/en/welcome" } → thẻ hreflang. */
  alternates?: Record<string, string>;
  robots?: string;
  openGraph?: {
    title?: string; description?: string; image?: string; type?: string; url?: string;
    /** Nhiều ảnh kèm kích thước (ưu tiên hơn `image`). */
    images?: Array<{ url: string; width?: number; height?: number; alt?: string }>;
    siteName?: string; locale?: string;
    /** Bài viết (type = article). */
    publishedTime?: string; modifiedTime?: string; section?: string; tags?: string[]; authors?: string[];
  };
  twitter?: { card?: "summary" | "summary_large_image"; title?: string; description?: string; image?: string; site?: string; creator?: string };
  /** Mã xác minh chủ sở hữu (Google Search Console, Bing, Yandex…): { google: "...", other: { "msvalidate.01": "..." } }. */
  verification?: { google?: string; yandex?: string; yahoo?: string; other?: Record<string, string> };
  /** Thẻ meta khác: { name: content }. */
  extra?: Record<string, string>;
}

/** Một URL trong sitemap.xml (filter "sitemap.entries"). */
export interface SitemapEntry {
  url: string; lastModified?: string | Date; changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number; images?: string[]; alternates?: { languages?: Record<string, string> };
}

/** Route gốc do plugin cung cấp (vd /news-sitemap.xml): nhận Request, trả Response. Khai báo đường dẫn trong plugin.json → frontend.routes. */
export type PluginRoute = (req: Request, ctx: { site: Site; path: string }) => Response | Promise<Response>;

export interface FilterMap {
  /** Sửa metadata của trang (title, description, og…). */
  "document.metadata": (meta: DocumentMetadata, ctx: { site: Site; data: ResolveResult }) => DocumentMetadata | Promise<DocumentMetadata>;
  /** Sửa danh sách block trước khi render nội dung bài viết. */
  "post.blocks": (blocks: Block[], ctx: { site: Site; post?: Post | null }) => Block[] | Promise<Block[]>;
  /** Sửa nội dung robots.txt (văn bản). */
  "robots.txt": (content: string, ctx: { site: Site }) => string | Promise<string>;
  /** Sửa danh sách URL của sitemap.xml. */
  "sitemap.entries": (entries: SitemapEntry[], ctx: { site: Site }) => SitemapEntry[] | Promise<SitemapEntry[]>;
}

export type CoreSlotName = "head" | "body.start" | "body.end" | "before.content" | "after.content" | "footer";
export type SlotName = CoreSlotName | (string & {});

/** Một handler gắn vào Slot, kèm priority (mặc định 10, số nhỏ chạy trước). */
export interface SlotHandler<P = any> {
  component: ComponentType<P>;
  priority?: number;
}

export type SlotComponent<P = any> = ComponentType<P> | SlotHandler<P>;
export type SlotRegistration<P = any> = SlotComponent<P> | Array<SlotComponent<P>>;

export interface FilterMap {
  /** Sửa metadata của trang (title, description, og…). */
  "document.metadata": (meta: DocumentMetadata, ctx: { site: Site; data: ResolveResult }) => DocumentMetadata | Promise<DocumentMetadata>;
  /** Sửa danh sách block trước khi render nội dung bài viết. */
  "post.blocks": (blocks: Block[], ctx: { site: Site; post?: Post | null }) => Block[] | Promise<Block[]>;
  /** Sửa nội dung robots.txt (văn bản). */
  "robots.txt": (content: string, ctx: { site: Site }) => string | Promise<string>;
  /** Sửa danh sách URL của sitemap.xml. */
  "sitemap.entries": (entries: SitemapEntry[], ctx: { site: Site }) => SitemapEntry[] | Promise<SitemapEntry[]>;
  /** Cho phép các filter tùy biến bất kỳ của plugin/theme */
  [customFilter: string]: ((val: any, ctx?: any) => any) | undefined;
}

export interface PluginDefinition {
  /** [contact-form id="1"] trong nội dung → component. */
  shortcodes?: Record<string, ComponentType<ShortcodeProps>>;
  /** Renderer cho loại widget đã khai báo ở backend (IWidgetRegistry). */
  widgets?: Record<string, ComponentType<WidgetProps>>;
  /** Chèn component vào vị trí cố định của trang (hỗ trợ tên tự do, ưu tiên priority). */
  slots?: Record<string, SlotRegistration<any>>;
  /** Biến đổi dữ liệu theo chuỗi filter kiểu WordPress (applyFilters). */
  filters?: { [K in keyof FilterMap]?: FilterMap[K] };
  /** Lắng nghe action phát ra từ theme/plugin kiểu WordPress (doAction). */
  actions?: Record<string, ((...args: any[]) => void | Promise<void>) | Array<{ handler: (...args: any[]) => void | Promise<void>; priority?: number }>>;
  /** Renderer cho loại block mới (dùng khi có page builder). */
  blocks?: Record<string, ComponentType<BlockProps>>;
  /** File ở gốc website: { "/news-sitemap.xml": handler }. Đường dẫn phải khai báo trong plugin.json → frontend.routes. */
  routes?: Record<string, PluginRoute>;
  /**
   * Hàm công bố cho theme và plugin khác dùng (chạy phía server) — tương đương hàm toàn cục kiểu woo_get_cart() của WordPress:
   *   definePlugin({ exports: { getCart, formatPrice } })
   *   const woo = await getPlugin<WooApi>("woo"); await woo?.getCart();
   */
  exports?: Record<string, unknown>;
  /**
   * Template của plugin (trang sản phẩm, giỏ hàng, tài khoản…). Theme có template cùng tên thì dùng của theme —
   * như thư mục woocommerce/ trong theme WordPress. Ưu tiên theo danh sách template của trang: tên cụ thể hơn thắng.
   */
  templates?: Record<string, ComponentType<TemplateProps>>;
}
