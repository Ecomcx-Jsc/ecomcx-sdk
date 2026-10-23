import { ExtensionBoundary, PostPasswordForm } from "./client";
import { applyFilters, findBlock, findShortcode, getActiveExtensions } from "./runtime";
import type { Post, PostContentDoc } from "./types";
import { getSite } from "./api";
import { getT } from "./i18n";
import { renderDynamic } from "./dynamic";
import { renderContent } from "./rich";
import { cx } from "./utils";

/**
 * Render nội dung bài viết (định dạng của CMS — @cms/content; phần vẽ ở rich.tsx, không phụ thuộc trình soạn).
 * Luôn có class `ecx-content` (giao diện nền trong @cms/content/style.css, theme ghi đè được); `className` thay cho `entry-content`.
 */
export async function PostContent({ post, content, className }: { post?: Post | null; content?: PostContentDoc | null; className?: string }) {
  const site = await getSite();
  const doc = content ?? post?.content;
  if (!content && post?.passwordProtected && !post.content) {
    const t = await getT();
    return <div className={cx(className ?? "entry-content", "ecx-content")}><PostPasswordForm postId={post.id} labels={{ intro: t("password.intro"), label: t("password.label"), submit: t("password.submit"), wrong: t("password.wrong") }} /></div>;
  }
  if (!doc?.blocks?.length) return null;
  const t = await getT();
  const blocks = (await getActiveExtensions(site)).flatMap((d) => d.blockTypes ?? []);
  const rendered = await renderContent(doc, {
    site, post, blocks,
    resolve: { shortcode: (name) => findShortcode(name, site), block: (type) => findBlock(type, site) },
    labels: { download: t("file.download") },
    boundary: (name, key, el) => <ExtensionBoundary key={key} name={name}>{el}</ExtensionBoundary>,
    dynamic: renderDynamic,
  }, (blocks) => applyFilters("post.blocks", blocks, { site, post }, site));
  return <div className={cx(className ?? "entry-content", "ecx-content")}>{rendered}</div>;
}
