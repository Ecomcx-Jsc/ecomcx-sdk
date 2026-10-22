/**
 * Định dạng nội dung của CMS (phiên bản 1). Đây là chuẩn của CMS — trình soạn (hiện là TipTap/ProseMirror) phải
 * chuyển sang chuẩn này, website và máy chủ chỉ đọc chuẩn này. Đổi trình soạn không đổi dữ liệu đã lưu.
 */

/** Phiên bản định dạng hiện tại. Tăng khi đổi cấu trúc — kèm hàm nâng cấp trong migrate.ts. */
export const CONTENT_VERSION = 1;

/** Nội dung một bài viết / trang: danh sách khối cấp cao nhất. */
export interface ContentDoc {
  version: number;
  blocks: Block[];
}

/**
 * Khối cấp cao nhất.
 * - `richtext`: `data` là cây {@link RichNode} gốc `type: "doc"` (nội dung soạn bằng trình soạn).
 * - `html`: `data.html` là HTML (nội dung nhập từ hệ thống cũ).
 * - tên khác: khối của plugin, `data` do plugin định nghĩa. Plugin không có/đã tắt → giữ nguyên dữ liệu, website bỏ qua.
 */
export interface Block {
  id?: string;
  type: string;
  data: any;
}

/** Nút trong nội dung soạn thảo: khối (đoạn, tiêu đề, ảnh…) hoặc chữ (`type: "text"`). */
export interface RichNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  /** Chỉ có ở `type: "text"`, không rỗng. */
  text?: string;
  /** Định dạng chữ (đậm, liên kết…), chỉ có ở `type: "text"`. */
  marks?: RichMark[];
}

export interface RichMark {
  type: string;
  attrs?: Record<string, unknown>;
}
