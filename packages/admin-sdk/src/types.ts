import type { ComponentType, ReactNode } from "react";

export interface ApiClient {
  get<T = any>(path: string): Promise<T>;
  post<T = any>(path: string, body?: unknown): Promise<T>;
  put<T = any>(path: string, body?: unknown): Promise<T>;
  del<T = any>(path: string): Promise<T>;
  upload<T = any>(path: string, file: File, field?: string): Promise<T>;
}

export interface MetaBoxProps {
  postType: string;
  post: { id?: number; title: string; slug: string; status: string; meta: Record<string, any>; [k: string]: any };
  /** Giá trị meta hiện tại (đã gồm thay đổi chưa lưu). */
  meta: Record<string, any>;
  /** Đặt meta — được lưu cùng bài viết khi bấm Lưu/Đăng. silent: không đánh dấu bài "Chưa lưu" (giá trị tự tính). */
  setMeta(key: string, value: any, opts?: { silent?: boolean }): void;
  /** Nội dung đang soạn ({ version, blocks }) — cập nhật khi gõ (trễ ~0,4 giây), dùng để phân tích nội dung. */
  content?: { version?: number; blocks: Array<{ type: string; data?: any }> };
  excerpt?: string;
  /** Đường dẫn công khai (xem trước) và địa chỉ website. */
  link?: string;
  siteUrl?: string;
  locale?: string;
  featuredMedia?: { id: number; url: string; alt?: string; width?: number; height?: number } | null;
  /** id chuyên mục/thẻ đang chọn theo taxonomy. */
  terms?: Record<string, number[]>;
}

/** Một dòng trong danh sách bài (kèm meta đã khai báo trong metaKeys của cột). */
export interface PostListRow { id: number; type: string; title: string; slug: string; status: string; locale: string; link: string; meta?: Record<string, any> | null; [k: string]: any }

/** Cột thêm vào danh sách bài viết/trang. */
export interface PostListColumn {
  id: string;
  title: string;
  /** Bỏ trống = mọi post type. */
  postTypes?: string[];
  /** Meta cần tải kèm mỗi dòng (vd ["_ecx_seo"]). */
  metaKeys?: string[];
  width?: number;
  align?: "left" | "right" | "center";
  component: ComponentType<{ row: PostListRow }>;
}

export interface TermMetaBoxProps {
  taxonomy: string;
  term: { id?: number; name: string; slug: string; description: string; meta: Record<string, any> };
  meta: Record<string, any>;
  setMeta(key: string, value: any): void;
}

/** Hộp thêm vào form sửa chuyên mục/thẻ. */
export interface TermMetaBox {
  id: string;
  title: string;
  /** Bỏ trống = mọi taxonomy. */
  taxonomies?: string[];
  component: ComponentType<TermMetaBoxProps>;
}

export interface MetaBox {
  id: string;
  title: string;
  /** Bỏ trống = mọi post type. */
  postTypes?: string[];
  context?: "main" | "side";
  priority?: number;
  component: ComponentType<MetaBoxProps>;
}

export interface AdminPage {
  /** Khớp với Path khai báo trong IAdminRegistry.AddMenu ở backend, vd "/redirects". */
  path: string;
  title?: string;
  component: ComponentType<{ path: string }>;
}

export interface DashboardWidget { id: string; title: string; component: ComponentType }

export interface Notify {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

export interface Column<T> { key: string; title: ReactNode; render?: (row: T) => ReactNode; width?: number | string; align?: "left" | "right" | "center" }

export interface AdminSlotItem {
  id?: string;
  slot: string;
  component: ComponentType<any>;
  priority?: number;
  postTypes?: string[];
}

export interface PostRowAction {
  id: string;
  title: string;
  postTypes?: string[];
  icon?: ComponentType<any>;
  component?: ComponentType<{ row: PostListRow; navigate?: (path: string) => void }>;
  onClick?: (row: PostListRow, navigate: (path: string) => void) => void;
  priority?: number;
}

/** Thao tác hàng loạt trên danh sách bài (hiện khi chọn nhiều dòng) — bulk_actions của WordPress. */
export interface PostBulkAction {
  id: string;
  title: string;
  postTypes?: string[];
  icon?: ComponentType<any>;
  /** Hỏi lại trước khi chạy (vd "Đặt hết hàng cho {0} sản phẩm?" — {0} = số mục). */
  confirm?: string;
  /** Gọi API của plugin; ném lỗi để báo thất bại. Xong thì danh sách tự tải lại. */
  run(ids: number[]): Promise<void | string>;
  priority?: number;
}

/** Bộ lọc thêm vào danh sách bài: chọn một giá trị → chỉ hiện bài có meta[metaKey] == giá trị đó. */
export interface PostListFilter {
  id: string;
  /** Nhãn của lựa chọn "tất cả", vd "Mọi tình trạng kho". */
  label: string;
  postTypes?: string[];
  metaKey: string;
  /** value là JSON ("true", "12", "\"instock\"") hoặc chuỗi thường. */
  options: Array<{ value: string; label: string }>;
}

export interface UserProfileBoxProps {
  user: { id: number; userName: string; email: string; displayName: string; roles: string[] };
  /** Meta của người dùng (trừ khoá bắt đầu bằng "_" — dữ liệu riêng của plugin). */
  meta: Record<string, any>;
  /** Lưu ngay các khoá (null = xoá). Trả về meta mới. */
  saveMeta(patch: Record<string, any>): Promise<Record<string, any>>;
  /** Đang xem hồ sơ của chính mình. */
  isSelf: boolean;
}

/** Hộp thêm vào trang sửa thành viên và "Hồ sơ của bạn" (dữ liệu lưu trong user meta) — show_user_profile của WordPress. */
export interface UserProfileBox {
  id: string;
  title: string;
  description?: string;
  /** Chỉ hiện với thành viên có một trong các vai trò này (bỏ trống = mọi người). */
  roles?: string[];
  component: ComponentType<UserProfileBoxProps>;
  priority?: number;
}

export interface MetaBoxesProps {
  postType: string;
  context?: "main" | "side" | "normal" | "all";
  post: { id?: number; title: string; slug: string; status: string; meta: Record<string, any>; [k: string]: any };
  meta: Record<string, any>;
  setMeta(key: string, value: any, opts?: { silent?: boolean }): void;
  content?: any;
  excerpt?: string;
  link?: string;
  siteUrl?: string;
  locale?: string;
  featuredMedia?: any;
  terms?: Record<string, number[]>;
  excludeIds?: string[];
  className?: string;
}

export interface AdminHookRegistry {
  addAction(hook: string, namespace: string, callback: (...args: any[]) => void, priority?: number): void;
  doAction(hook: string, ...args: any[]): void;
  addFilter<T = any>(filter: string, namespace: string, callback: (value: T, ...args: any[]) => T, priority?: number): void;
  applyFilters<T = any>(filter: string, value: T, ...args: any[]): T;
  removeAction(hook: string, namespace: string): void;
  removeFilter(filter: string, namespace: string): void;
  hasAction(hook: string, namespace?: string): boolean;
  hasFilter(filter: string, namespace?: string): boolean;
}

/** Bộ component UI của admin (Tailwind) — plugin dùng để giao diện đồng bộ với admin. */
export interface UiKit {
  Button: ComponentType<{ variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md"; loading?: boolean; icon?: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>>;
  Input: ComponentType<React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }>;
  Textarea: ComponentType<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }>;
  Select: ComponentType<React.SelectHTMLAttributes<HTMLSelectElement> & { options: Array<{ value: string; label: string }> }>;
  Checkbox: ComponentType<{ checked: boolean; onChange(checked: boolean): void; label?: ReactNode; disabled?: boolean; description?: ReactNode }>;
  Field: ComponentType<{ label: ReactNode; help?: ReactNode; error?: ReactNode; children: ReactNode }>;
  Card: ComponentType<{ title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }>;
  PageHeader: ComponentType<{ title: ReactNode; description?: ReactNode; actions?: ReactNode }>;
  Table: ComponentType<{ columns: Column<any>[]; rows: any[]; rowKey?: (row: any) => string | number; empty?: ReactNode; loading?: boolean }>;
  Badge: ComponentType<{ tone?: "gray" | "green" | "yellow" | "red" | "blue"; children: ReactNode }>;
  Modal: ComponentType<{ open: boolean; title: ReactNode; onClose(): void; children: ReactNode; footer?: ReactNode; width?: number }>;
  Spinner: ComponentType<{ className?: string }>;
  EmptyState: ComponentType<{ title: ReactNode; description?: ReactNode; action?: ReactNode }>;
  MediaPicker: ComponentType<{ value?: { id: number; url: string } | null; onChange(value: { id: number; url: string } | null): void; accept?: string }>;
  Switch: ComponentType<{ checked: boolean; onChange(v: boolean): void; disabled?: boolean; label?: string }>;
  IconButton: ComponentType<{ label: string; active?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>>;
  Section: ComponentType<{ title: ReactNode; children: ReactNode; defaultOpen?: boolean; actions?: ReactNode }>;
  Tabs: ComponentType<{ value: string; onChange(v: string): void; items: Array<{ value: string; label: ReactNode; count?: number }> }>;
  MetaBoxes: ComponentType<MetaBoxesProps>;
  Slot: ComponentType<{ name: string; props?: any; fallback?: ReactNode; postType?: string; className?: string }>;
  Fill: ComponentType<{ name: string; priority?: number; children: ReactNode }>;
}

export interface CmsAdmin {
  version: string;
  React: typeof import("react");
  jsxRuntime: typeof import("react/jsx-runtime");
  api: ApiClient;
  notify: Notify;
  ui: UiKit;
  hooks: AdminHookRegistry;
  registerPage(page: AdminPage): void;
  registerMetaBox(box: MetaBox): void;
  registerDashboardWidget(widget: DashboardWidget): void;
  registerPostListColumn(column: PostListColumn): void;
  registerTermMetaBox(box: TermMetaBox): void;
  registerSlot(slot: AdminSlotItem): void;
  getSlots(slot: string, postType?: string): Array<AdminSlotItem>;
  registerPostRowAction(action: PostRowAction): void;
  registerPostBulkAction?(action: PostBulkAction): void;
  registerPostListFilter?(filter: PostListFilter): void;
  registerUserProfileBox?(box: UserProfileBox): void;
  getPostRowActions(postType?: string): Array<PostRowAction>;
  getMetaBoxes?(postType?: string): MetaBox[];
  usePluginUi?(): any;
  /** Hook React lấy dữ liệu đơn giản: const { data, loading, error, reload } = useApi("/admin/...") */
  useApi<T = any>(path: string | null): { data: T | undefined; loading: boolean; error: Error | null; reload(): void };
  currentUser(): { id: number; displayName: string; capabilities: string[] } | null;
  can(capability: string): boolean;
  /** Hàm công bố cho plugin khác dùng trong admin (xem exposeApi/getPluginApi). */
  plugins?: {
    expose(slug: string, api: Record<string, unknown>): void;
    get<T = Record<string, unknown>>(slug: string): T | undefined;
    wait<T = Record<string, unknown>>(slug: string, timeoutMs?: number): Promise<T | undefined>;
  };
  /** Dịch giao diện: ngôn ngữ admin hiện tại ("vi" | "en"), hàm dịch và bổ sung bản dịch của plugin. */
  i18n: { locale: string; __(text: string, ...args: unknown[]): string; registerTranslations(locale: string, dict: Record<string, string>): void };
  /** Trình soạn nội dung (@cms/editor): thêm khối/lệnh chèn; dùng chung TipTap của admin. */
  editor: {
    register(pack: EditorExtensionPack): void;
    tiptap: { Node: any; Mark: any; Extension: any; mergeAttributes: (...attrs: any[]) => Record<string, any> };
  };
}

/** Gói mở rộng trình soạn: node/mark TipTap + lệnh chèn trong slash menu "/". */
export interface EditorExtensionPack {
  name: string;
  extensions?: any[];
  insertItems?: Array<{ key: string; title: string; hint: string; icon: any; keywords: string; run(editor: any, range?: any): void }>;
}
