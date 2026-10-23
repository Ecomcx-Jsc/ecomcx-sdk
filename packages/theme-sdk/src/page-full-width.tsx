import { PostContent } from "./content";
import type { TemplateProps } from "./types";

/** Template "full-width": giữ header/footer của theme, nội dung trải hết chiều ngang màn hình. */
export default function FullWidth({ data }: TemplateProps) {
  return <div className="ecx-full-width"><PostContent post={data.post} /></div>;
}
