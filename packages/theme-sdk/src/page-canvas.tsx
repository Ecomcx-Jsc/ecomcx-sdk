import { PostContent } from "./content";
import type { TemplateProps } from "./types";

/** Template "canvas": không có header/footer của theme, chỉ nội dung trang (trang dựng bằng khối). */
export default function Canvas({ data }: TemplateProps) {
  return <main className="ecx-canvas"><PostContent post={data.post} /></main>;
}

export const layout = false;
