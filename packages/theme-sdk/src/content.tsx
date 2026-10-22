import { ExtensionBoundary, PostPasswordForm } from "./client";
import { applyFilters, findBlock, findShortcode, getActiveExtensions } from "./runtime";
import type { Post, PostContentDoc } from "./types";
import { getSite } from "./api";
import { getT } from "./i18n";
import { renderContent } from "./rich";

/** Render nội dung bài viết (định dạng của CMS — @cms/content; phần vẽ ở rich.tsx, không phụ thuộc trình soạn). */
export async function PostContent({ post, content, className }: { post?: Post | null; content?: PostContentDoc | null; className?: string }) {
  const site = await getSite();
  const doc = content ?? post?.content;
  if (!content && post?.passwordProtected && !post.content) {
    const t = await getT();
    return <div className={className ?? "entry-content"}><PostPasswordForm postId={post.id} labels={{ intro: t("password.intro"), label: t("password.label"), submit: t("password.submit"), wrong: t("password.wrong") }} /></div>;
  }
  if (!doc?.blocks?.length) return null;
  const t = await getT();
  const blocks = (await getActiveExtensions(site)).flatMap((d) => d.blockTypes ?? []);
  const rendered = await renderContent(doc, {
    site, post, blocks,
    resolve: { shortcode: (name) => findShortcode(name, site), block: (type) => findBlock(type, site) },
    labels: { download: t("file.download") },
    boundary: (name, key, el) => <ExtensionBoundary key={key} name={name}>{el}</ExtensionBoundary>,
  }, (blocks) => applyFilters("post.blocks", blocks, { site, post }, site));
  return <div className={className ?? "entry-content"}>{rendered}</div>;
}
