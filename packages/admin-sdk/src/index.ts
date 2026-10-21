import { host } from "./host";
import type { AdminPage, DashboardWidget, MetaBox, UiKit } from "./types";

export * from "./types";

export const registerPage = (page: AdminPage) => host().registerPage(page);
export const registerMetaBox = (box: MetaBox) => host().registerMetaBox(box);
/** Sidebar riêng trong trình soạn bài, kèm nút trên thanh hành động (CMS cũ chưa hỗ trợ thì bỏ qua). */
export const registerEditorSidebar = (s: import("./types").EditorSidebar) => host().registerEditorSidebar?.(s);
export const registerDashboardWidget = (w: DashboardWidget) => host().registerDashboardWidget(w);
/** Thêm cột vào danh sách bài viết/trang (vd điểm SEO). */
export const registerPostListColumn = (c: import("./types").PostListColumn) => host().registerPostListColumn(c);
/** Thêm hộp vào form sửa chuyên mục/thẻ (dữ liệu lưu trong term.meta). */
export const registerTermMetaBox = (b: import("./types").TermMetaBox) => host().registerTermMetaBox(b);
/** Lấy các MetaBox đã đăng ký trong hệ thống (tùy chọn lọc theo postType). */
export const getMetaBoxes = (postType?: string) => (host().getMetaBoxes ? host().getMetaBoxes!(postType) : []);
/** Hook lấy toàn bộ state plugin UI trong host. */
export const usePluginUi = () => (host().usePluginUi ? host().usePluginUi!() : { metaBoxes: [], pages: {}, dashboardWidgets: [], postListColumns: [], termMetaBoxes: [], loaded: true, errors: [] });
export const useApi = <T = any>(path: string | null) => host().useApi<T>(path);
export const can = (capability: string) => host().can(capability);
/** Thêm khối cho trình soạn nội dung . */
export const registerEditorExtension = (pack: import("./types").EditorExtensionPack) => host().editor.register(pack);
/** Lớp TipTap dùng chung với admin (không cần cài @tiptap/core trong plugin). */
export const tiptap = new Proxy({} as CmsAdminTiptap, { get: (_t, k: string) => (host().editor.tiptap as any)[k] });
type CmsAdminTiptap = import("./types").CmsAdmin["editor"]["tiptap"];
export const currentUser = () => host().currentUser();
/**
 * Công bố hàm cho plugin khác dùng trong admin (gọi ở đầu bundle):  exposeApi({ openCartDrawer, formatPrice })
 * Bên dùng:  const woo = await waitForPluginApi<WooAdminApi>("woo");  woo?.formatPrice(1000)
 */
export const exposeApi = (api: Record<string, unknown>) => host().plugins?.expose("", api);
/** Hàm plugin khác đã công bố (undefined nếu plugin chưa bật hoặc bundle chưa nạp xong). */
export const getPluginApi = <T = Record<string, unknown>>(slug: string) => host().plugins?.get<T>(slug);
/** Chờ plugin khác nạp xong rồi lấy hàm (undefined nếu plugin không bật). */
export const waitForPluginApi = <T = Record<string, unknown>>(slug: string, timeoutMs?: number) =>
  host().plugins ? host().plugins!.wait<T>(slug, timeoutMs) : Promise.resolve(undefined);
/**
 * Dịch chuỗi giao diện theo khoá (ICU MessageFormat). Bản dịch của plugin đặt trong gói: locales/vi.json, locales/en.json
 * — CMS tự nạp với namespace = slug plugin (như text domain của WordPress):
 *   locales/en.json: { "form.title": "Contact", "form.count": "{count, plural, one {# message} other {# messages}}" }
 *   const t = createT("lien-he");  t("form.title") → "Contact";  t("form.count", { count: 3 }) → "3 messages"
 * Khoá có ":" là khoá đầy đủ ("core:common.save" — nhãn chung của lõi, "plugin-khac:x").
 */
export const t = (key: string, values?: Record<string, unknown>) => (host().i18n.t ? host().i18n.t!(key, values) : key);
/** Hàm dịch gắn sẵn namespace của plugin. */
export const createT = (namespace: string) => (key: string, values?: Record<string, unknown>) => t(key.includes(":") ? key : `${namespace}:${key}`, values);
/** Thêm bản dịch bằng mã (ngoài locales/*.json), vd bản dịch tải từ API. */
export const registerMessages = (namespace: string, locale: string, dict: Record<string, string>) => host().i18n.registerMessages?.(namespace, locale, dict);
/** @deprecated Chuỗi gốc tiếng Việt làm khoá — dùng t()/createT() với locales/*.json. */
export const __ = (text: string, ...args: unknown[]) => host().i18n.__(text, ...args);
/** @deprecated Dùng locales/*.json hoặc registerMessages(). */
export const registerTranslations = (locale: string, dict: Record<string, string>) => host().i18n.registerTranslations(locale, dict);
export const adminLocale = () => host().i18n.locale;

export const api = {
  get: <T = any>(p: string) => host().api.get<T>(p),
  post: <T = any>(p: string, b?: unknown) => host().api.post<T>(p, b),
  put: <T = any>(p: string, b?: unknown) => host().api.put<T>(p, b),
  del: <T = any>(p: string) => host().api.del<T>(p),
  upload: <T = any>(p: string, f: File, field?: string) => host().api.upload<T>(p, f, field),
};

export const notify = {
  success: (m: string) => host().notify.success(m),
  error: (m: string) => host().notify.error(m),
  info: (m: string) => host().notify.info(m),
};

// Component UI: lấy lười từ host để module plugin có thể được import trước khi render.
const ui = <K extends keyof UiKit>(name: K): UiKit[K] => ((props: any) => {
  const C = host().ui[name] as any;
  return host().React.createElement(C, props);
}) as any;

export const registerSlot = (slot: import("./types").AdminSlotItem) => host().registerSlot(slot);
export const getSlots = (slot: string, postType?: string) => (host().getSlots ? host().getSlots(slot, postType) : []);
export const registerPostRowAction = (a: import("./types").PostRowAction) => host().registerPostRowAction(a);
/** Thao tác hàng loạt trên danh sách bài (CMS ≥ 1.2.0). */
export const registerPostBulkAction = (a: import("./types").PostBulkAction) => host().registerPostBulkAction?.(a);
/** Bộ lọc theo meta trên danh sách bài (CMS ≥ 1.2.0). */
export const registerPostListFilter = (f: import("./types").PostListFilter) => host().registerPostListFilter?.(f);
/** Hộp trong trang sửa thành viên / hồ sơ, lưu vào user meta (CMS ≥ 1.2.0). */
export const registerUserProfileBox = (b: import("./types").UserProfileBox) => host().registerUserProfileBox?.(b);
export const getPostRowActions = (postType?: string) => (host().getPostRowActions ? host().getPostRowActions(postType) : []);

export const hooks = new Proxy({} as import("./types").AdminHookRegistry, {
  get: (_t, k: string) => (host().hooks as any)?.[k] ?? (() => {}),
});
export const addAction = (hook: string, namespace: string, cb: (...args: any[]) => void, priority?: number) => host().hooks.addAction(hook, namespace, cb, priority);
export const doAction = (hook: string, ...args: any[]) => host().hooks.doAction(hook, ...args);
export const addFilter = <T = any>(filter: string, namespace: string, cb: (v: T, ...args: any[]) => T, priority?: number) => host().hooks.addFilter(filter, namespace, cb, priority);
export const applyFilters = <T = any>(filter: string, value: T, ...args: any[]) => host().hooks.applyFilters(filter, value, ...args);
export const removeAction = (hook: string, namespace: string) => host().hooks.removeAction(hook, namespace);
export const removeFilter = (filter: string, namespace: string) => host().hooks.removeFilter(filter, namespace);
export const hasAction = (hook: string, namespace?: string) => host().hooks.hasAction(hook, namespace);
export const hasFilter = (filter: string, namespace?: string) => host().hooks.hasFilter(filter, namespace);

export const Button = ui("Button");
export const Input = ui("Input");
export const Textarea = ui("Textarea");
export const Select = ui("Select");
export const Checkbox = ui("Checkbox");
export const Field = ui("Field");
export const Card = ui("Card");
export const PageHeader = ui("PageHeader");
export const Table = ui("Table");
export const Badge = ui("Badge");
export const Modal = ui("Modal");
export const Spinner = ui("Spinner");
export const EmptyState = ui("EmptyState");
export const MediaPicker = ui("MediaPicker");
export const Switch = ui("Switch");
export const IconButton = ui("IconButton");
export const Section = ui("Section");
export const Tabs = ui("Tabs");
export const MetaBoxes = ui("MetaBoxes");
export const Slot = ui("Slot");
export const Fill = ui("Fill");
