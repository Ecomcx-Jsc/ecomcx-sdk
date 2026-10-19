import { Fragment, type CSSProperties, type ReactNode } from "react";
import { applyFilters, findBlock, findShortcode } from "./runtime";
import type { Block, Post, PostContentDoc, Site } from "./types";
import { getSite } from "./api";
import { cx } from "./utils";
import { getT } from "./i18n";
import { ExtensionBoundary, PostPasswordForm } from "./client";

type Node = { type: string; attrs?: Record<string, any>; content?: Node[]; text?: string; marks?: Array<{ type: string; attrs?: Record<string, any> }> };

const SHORTCODE = /^\s*\[([a-z0-9_-]+)((?:\s+[a-z0-9_-]+=(?:"[^"]*"|'[^']*'|[^\s\]]+))*)\s*\]\s*$/i;
const SHORTCODE_INLINE = /\[([a-z0-9_-]+)((?:\s+[a-z0-9_-]+=(?:"[^"]*"|'[^']*'|[^\s\]]+))*)\s*\]/gi;

function parseAttrs(raw: string) {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(/([a-z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/gi)) attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  return attrs;
}

function plainText(node: Node): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainText).join("");
}

function alignStyle(attrs?: Record<string, any>): CSSProperties | undefined {
  return attrs?.textAlign && attrs.textAlign !== "left" ? { textAlign: attrs.textAlign } : undefined;
}

function safeHref(href: unknown) {
  const s = String(href ?? "");
  return /^(https?:|mailto:|tel:|\/|#)/i.test(s) ? s : "#";
}

function renderMarks(text: ReactNode, marks: Node["marks"], key: string): ReactNode {
  let out = text;
  for (const [i, m] of (marks ?? []).entries()) {
    const k = `${key}-m${i}`;
    switch (m.type) {
      case "bold": out = <strong key={k}>{out}</strong>; break;
      case "italic": out = <em key={k}>{out}</em>; break;
      case "underline": out = <u key={k}>{out}</u>; break;
      case "strike": out = <s key={k}>{out}</s>; break;
      case "code": out = <code key={k}>{out}</code>; break;
      case "subscript": out = <sub key={k}>{out}</sub>; break;
      case "superscript": out = <sup key={k}>{out}</sup>; break;
      case "highlight": out = <mark key={k} style={m.attrs?.color ? { background: m.attrs.color } : undefined}>{out}</mark>; break;
      case "textStyle": out = m.attrs?.color ? <span key={k} style={{ color: m.attrs.color }}>{out}</span> : out; break;
      case "link": {
        const target = m.attrs?.target;
        // rel do người viết/plugin đặt (nofollow, sponsored, ugc…) + luôn noopener khi mở tab mới
        const rel = new Set(String(m.attrs?.rel ?? "").toLowerCase().split(/\s+/).filter((x) => /^[a-z-]+$/.test(x)));
        if (target === "_blank") { rel.add("noopener"); rel.add("noreferrer"); }
        out = <a key={k} href={safeHref(m.attrs?.href)} target={target ?? undefined} rel={rel.size ? [...rel].join(" ") : undefined}>{out}</a>;
        break;
      }
    }
  }
  return out;
}

async function renderNode(node: Node, key: string, ctx: Ctx): Promise<ReactNode> {
  const children = async () => Promise.all((node.content ?? []).map((c, i) => renderNode(c, `${key}-${i}`, ctx)));
  const a = node.attrs ?? {};
  switch (node.type) {
    case "doc": return <Fragment key={key}>{await children()}</Fragment>;
    case "text": return renderMarks(node.text ?? "", node.marks, key);
    case "paragraph": {
      // Đoạn văn chỉ chứa shortcode → render component của plugin.
      const text = plainText(node);
      const sc = SHORTCODE.exec(text);
      if (sc) {
        const Comp = await findShortcode(sc[1], ctx.site);
        if (Comp) return <ExtensionBoundary key={key} name={`Shortcode [${sc[1]}]`}><Comp attrs={parseAttrs(sc[2] ?? "")} site={ctx.site} post={ctx.post} /></ExtensionBoundary>;
        // Shortcode của plugin chưa cài/đã tắt: ẩn với người đọc thay vì hiện mã thô.
        console.warn(`[cms] Shortcode [${sc[1]}] không có plugin nào xử lý — đã ẩn khỏi trang`);
        return null;
      }
      return <p key={key} style={alignStyle(a)}>{await children()}</p>;
    }
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(a.level) || 2));
      const Tag = `h${level}` as "h2";
      const id = a.id ?? plainText(node).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return <Tag key={key} id={id || undefined} style={alignStyle(a)}>{await children()}</Tag>;
    }
    case "bulletList": return <ul key={key}>{await children()}</ul>;
    case "orderedList": return <ol key={key} start={a.start && a.start !== 1 ? a.start : undefined}>{await children()}</ol>;
    case "listItem": return <li key={key}>{await children()}</li>;
    case "taskList": return <ul key={key} className="task-list">{await children()}</ul>;
    case "taskItem": return <li key={key} className="task-item"><input type="checkbox" checked={!!a.checked} readOnly /> {await children()}</li>;
    case "blockquote": return <blockquote key={key}>{await children()}</blockquote>;
    case "codeBlock": return <pre key={key}><code className={a.language ? `language-${a.language}` : undefined}>{plainText(node)}</code></pre>;
    case "hardBreak": return <br key={key} />;
    case "horizontalRule": return <hr key={key} />;
    case "image": {
      // Ảnh chèn từ thư viện mang sẵn srcset (JPEG + WebP) và kích thước → responsive, không nhảy layout
      // Bề rộng hiển thị = cỡ người viết kéo trong trình soạn → trình duyệt chọn file vừa đúng
      const sizes = a.width ? `(max-width: ${a.width}px) 100vw, ${a.width}px` : (a.sizes || "(max-width: 1024px) 100vw, 1024px");
      const img = <img src={String(a.src ?? "")} srcSet={a.srcset || undefined} sizes={a.srcset ? sizes : undefined}
        alt={a.alt ?? ""} title={a.title ?? undefined} width={a.width ?? undefined} height={a.height ?? undefined} loading="lazy" decoding="async" />;
      const pic = a.webpSrcset ? <picture><source type="image/webp" srcSet={a.webpSrcset} sizes={sizes} />{img}</picture> : img;
      const cls = cx("cms-image", a.align && `align${a.align}`, a.mediaId && `cms-image-${a.mediaId}`);
      return a.caption || a.align ? <figure key={key} className={cls}>{pic}{a.caption && <figcaption>{a.caption}</figcaption>}</figure> : <Fragment key={key}>{pic}</Fragment>;
    }
    case "gallery": {
      const items = (a.images ?? []) as Array<{ src: string; srcset?: string; webpSrcset?: string; alt?: string; caption?: string; width?: number; height?: number; full?: string }>;
      const cols = Math.min(6, Math.max(1, Number(a.columns) || 3));
      return (
        <figure key={key} className={cx("cms-gallery", `columns-${cols}`)} style={{ display: "grid", gap: 8, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.map((im, i) => {
            const el = <img src={im.src} srcSet={im.srcset || undefined} sizes={`(max-width: 768px) 50vw, ${Math.round(100 / cols)}vw`} alt={im.alt ?? ""} width={im.width} height={im.height} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }} />;
            const pic = im.webpSrcset ? <picture><source type="image/webp" srcSet={im.webpSrcset} sizes={`(max-width: 768px) 50vw, ${Math.round(100 / cols)}vw`} />{el}</picture> : el;
            return <figure key={i} className="cms-gallery-item" style={{ margin: 0 }}>{im.full ? <a href={im.full}>{pic}</a> : pic}{im.caption && <figcaption>{im.caption}</figcaption>}</figure>;
          })}
          {a.caption && <figcaption className="cms-gallery-caption" style={{ gridColumn: "1 / -1" }}>{a.caption}</figcaption>}
        </figure>
      );
    }
    case "video":
      return <figure key={key} className="cms-video"><video src={String(a.src ?? "")} poster={a.poster || undefined} controls preload="metadata" playsInline style={{ width: "100%", height: "auto" }} />{a.caption && <figcaption>{a.caption}</figcaption>}</figure>;
    case "audio":
      return <figure key={key} className="cms-audio"><audio src={String(a.src ?? "")} controls preload="metadata" style={{ width: "100%" }} />{a.caption && <figcaption>{a.caption}</figcaption>}</figure>;
    case "file": {
      const isPdf = String(a.mime ?? "").includes("pdf") || /\.pdf($|\?)/i.test(String(a.src ?? ""));
      return (
        <div key={key} className="cms-file">
          {isPdf && a.embed !== false && <object data={String(a.src)} type="application/pdf" style={{ width: "100%", height: 600 }} aria-label={a.name}><a href={String(a.src)}>{a.name}</a></object>}
          <a className="cms-file-link" href={String(a.src ?? "")} download={a.download ? "" : undefined} target="_blank" rel="noopener">{a.name || "Tải tệp"}</a>
        </div>
      );
    }
    case "table": return <div key={key} className="table-wrap"><table><tbody>{await children()}</tbody></table></div>;
    case "tableRow": return <tr key={key}>{await children()}</tr>;
    case "tableHeader": return <th key={key} colSpan={a.colspan > 1 ? a.colspan : undefined} rowSpan={a.rowspan > 1 ? a.rowspan : undefined}>{await children()}</th>;
    case "tableCell": return <td key={key} colSpan={a.colspan > 1 ? a.colspan : undefined} rowSpan={a.rowspan > 1 ? a.rowspan : undefined}>{await children()}</td>;
    case "youtube": {
      const m = String(a.src ?? "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
      return m ? <div key={key} className="embed"><iframe src={`https://www.youtube-nocookie.com/embed/${m[1]}`} allowFullScreen loading="lazy" title="YouTube" /></div> : null;
    }
    default:
      return node.content ? <div key={key} data-node={node.type}>{await children()}</div> : null;
  }
}

interface Ctx { site: Site; post?: Post | null }

/** HTML (vd nội dung nhập từ hệ thống cũ): thay shortcode đứng riêng bằng component. */
async function renderHtml(html: string, key: string, ctx: Ctx): Promise<ReactNode> {
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of html.matchAll(SHORTCODE_INLINE)) {
    const Comp = await findShortcode(m[1], ctx.site);
    if (!Comp) continue;
    if (m.index! > last) parts.push(<div key={`${key}-h${i++}`} dangerouslySetInnerHTML={{ __html: html.slice(last, m.index) }} />);
    parts.push(<ExtensionBoundary key={`${key}-s${i++}`} name={`Shortcode [${m[1]}]`}><Comp attrs={parseAttrs(m[2] ?? "")} site={ctx.site} post={ctx.post} /></ExtensionBoundary>);
    last = m.index! + m[0].length;
  }
  if (last < html.length) parts.push(<div key={`${key}-h${i++}`} dangerouslySetInnerHTML={{ __html: html.slice(last) }} />);
  return <Fragment key={key}>{parts}</Fragment>;
}

async function renderBlock(block: Block, key: string, ctx: Ctx): Promise<ReactNode> {
  switch (block.type) {
    case "richtext": return block.data ? await renderNode(block.data as Node, key, ctx) : null;
    case "html": return await renderHtml(String(block.data?.html ?? ""), key, ctx);
    default: {
      const Comp = await findBlock(block.type, ctx.site);
      return Comp ? <ExtensionBoundary key={key} name={`Khối ${block.type}`}><Comp block={block} data={block.data} site={ctx.site} post={ctx.post} /></ExtensionBoundary> : null;
    }
  }
}

/** Render nội dung bài viết. */
export async function PostContent({ post, content, className }: { post?: Post | null; content?: PostContentDoc | null; className?: string }) {
  const site = await getSite();
  const doc = content ?? post?.content;
  if (!content && post?.passwordProtected && !post.content) {
    const t = await getT();
    return <div className={className ?? "entry-content"}><PostPasswordForm postId={post.id} labels={{ intro: t("password.intro"), label: t("password.label"), submit: t("password.submit"), wrong: t("password.wrong") }} /></div>;
  }
  if (!doc?.blocks?.length) return null;
  const blocks = await applyFilters("post.blocks", doc.blocks, { site, post }, site);
  const ctx: Ctx = { site, post };
  const rendered = await Promise.all(blocks.map((b, i) => renderBlock(b, b.id ?? `b${i}`, ctx)));
  return <div className={className ?? "entry-content"}>{rendered}</div>;
}
