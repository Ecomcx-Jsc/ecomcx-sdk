import { Fragment, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { normalizeContent, safeUrl, type Block, type BlockDefinition, type ContentDoc, type RichNode } from "@cms/content";
import type { BlockProps, Post, ShortcodeProps, Site } from "./types";
import { cx } from "./utils";

/**
 * Vẽ nội dung (định dạng của CMS — @cms/content) thành React, không phụ thuộc trình soạn.
 * Hàm thuần: shortcode/khối của plugin tra qua `resolve`, bọc lỗi qua `boundary` → test được không cần Next/runtime.
 */
export interface RenderContext {
  site: Site;
  post?: Post | null;
  resolve: {
    shortcode(name: string): Promise<ComponentType<ShortcodeProps> | null>;
    /** Khối của plugin: khối cấp cao nhất và nút trong nội dung soạn thảo dùng chung một renderer (definePlugin → blocks). */
    block(type: string): Promise<ComponentType<BlockProps> | null>;
  };
  /** Bọc component của plugin (lỗi chỉ ẩn phần đó). Mặc định: không bọc. */
  boundary?(name: string, key: string, el: ReactNode): ReactNode;
  /** Khối của plugin (defineBlock) — chuẩn hoá thuộc tính + nâng phiên bản khối lưu bằng bản cũ. */
  blocks?: readonly BlockDefinition[];
  /** Chữ giao diện (vd "Tải tệp"). */
  labels?: { download?: string };
}

// Renderer đọc thuộc tính một cách khoan dung (đã chuẩn hoá ở normalizeContent) → kiểu nới cho gọn
type Node = Omit<RichNode, "attrs" | "content" | "marks"> & { attrs?: Record<string, any>; content?: Node[]; marks?: Array<{ type: string; attrs?: Record<string, any> }> };

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
        out = <a key={k} href={safeUrl(m.attrs?.href)} target={target ?? undefined} rel={rel.size ? [...rel].join(" ") : undefined}>{out}</a>;
        break;
      }
    }
  }
  return out;
}

async function renderNode(node: Node, key: string, ctx: RenderContext): Promise<ReactNode> {
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
        const Comp = await ctx.resolve.shortcode(sc[1]);
        if (Comp) return wrap(ctx, `Shortcode [${sc[1]}]`, key, <Comp attrs={parseAttrs(sc[2] ?? "")} site={ctx.site} post={ctx.post} />);
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
      const img = <img src={safeUrl(a.src, "")} srcSet={a.srcset || undefined} sizes={a.srcset ? sizes : undefined}
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
            const el = <img src={safeUrl(im.src, "")} srcSet={im.srcset || undefined} sizes={`(max-width: 768px) 50vw, ${Math.round(100 / cols)}vw`} alt={im.alt ?? ""} width={im.width} height={im.height} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1" }} />;
            const pic = im.webpSrcset ? <picture><source type="image/webp" srcSet={im.webpSrcset} sizes={`(max-width: 768px) 50vw, ${Math.round(100 / cols)}vw`} />{el}</picture> : el;
            return <figure key={i} className="cms-gallery-item" style={{ margin: 0 }}>{im.full ? <a href={safeUrl(im.full)}>{pic}</a> : pic}{im.caption && <figcaption>{im.caption}</figcaption>}</figure>;
          })}
          {a.caption && <figcaption className="cms-gallery-caption" style={{ gridColumn: "1 / -1" }}>{a.caption}</figcaption>}
        </figure>
      );
    }
    case "video":
      return <figure key={key} className="cms-video"><video src={safeUrl(a.src, "")} poster={a.poster ? safeUrl(a.poster, "") : undefined} controls preload="metadata" playsInline style={{ width: "100%", height: "auto" }} />{a.caption && <figcaption>{a.caption}</figcaption>}</figure>;
    case "audio":
      return <figure key={key} className="cms-audio"><audio src={safeUrl(a.src, "")} controls preload="metadata" style={{ width: "100%" }} />{a.caption && <figcaption>{a.caption}</figcaption>}</figure>;
    case "file": {
      const isPdf = String(a.mime ?? "").includes("pdf") || /\.pdf($|\?)/i.test(String(a.src ?? ""));
      return (
        <div key={key} className="cms-file">
          {isPdf && a.embed !== false && <object data={safeUrl(a.src, "")} type="application/pdf" style={{ width: "100%", height: 600 }} aria-label={a.name}><a href={safeUrl(a.src)}>{a.name}</a></object>}
          <a className="cms-file-link" href={safeUrl(a.src)} download={a.download ? "" : undefined} target="_blank" rel="noopener">{a.name || ctx.labels?.download || "Download"}</a>
        </div>
      );
    }
    case "table": return <div key={key} className="table-wrap"><table><tbody>{await children()}</tbody></table></div>;
    case "tableRow": return <tr key={key}>{await children()}</tr>;
    case "tableHeader": return <th key={key} colSpan={a.colspan > 1 ? a.colspan : undefined} rowSpan={a.rowspan > 1 ? a.rowspan : undefined}>{await children()}</th>;
    case "tableCell": return <td key={key} colSpan={a.colspan > 1 ? a.colspan : undefined} rowSpan={a.rowspan > 1 ? a.rowspan : undefined}>{await children()}</td>;
    case "youtube": {
      const m = String(a.src ?? "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
      const start = Number(a.start) > 0 ? `?start=${Math.floor(Number(a.start))}` : "";
      return m ? <div key={key} className="embed"><iframe src={`https://www.youtube-nocookie.com/embed/${m[1]}${start}`} allowFullScreen loading="lazy" title="YouTube" /></div> : null;
    }
    default: {
      // Nút của plugin trong nội dung soạn thảo (defineBlock) — cùng renderer với khối cấp cao nhất: definePlugin({ blocks })
      const Comp = await ctx.resolve.block(node.type);
      const inner = node.content ? await children() : null;
      if (Comp) {
        const block: Block = { type: node.type, data: a };
        return wrap(ctx, `Block ${node.type}`, key, <Comp block={block} data={a} site={ctx.site} post={ctx.post}>{inner}</Comp>);
      }
      // Plugin đã tắt/chưa cài: vẫn hiện phần chữ bên trong (nếu có), không để lại khung rỗng
      return inner ? <Fragment key={key}>{inner}</Fragment> : null;
    }
  }
}


/** HTML (vd nội dung nhập từ hệ thống cũ): thay shortcode đứng riêng bằng component. */
async function renderHtml(html: string, key: string, ctx: RenderContext): Promise<ReactNode> {
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of html.matchAll(SHORTCODE_INLINE)) {
    const Comp = await ctx.resolve.shortcode(m[1]);
    if (!Comp) continue;
    if (m.index! > last) parts.push(<div key={`${key}-h${i++}`} dangerouslySetInnerHTML={{ __html: html.slice(last, m.index) }} />);
    parts.push(wrap(ctx, `Shortcode [${m[1]}]`, `${key}-s${i++}`, <Comp attrs={parseAttrs(m[2] ?? "")} site={ctx.site} post={ctx.post} />));
    last = m.index! + m[0].length;
  }
  if (last < html.length) parts.push(<div key={`${key}-h${i++}`} dangerouslySetInnerHTML={{ __html: html.slice(last) }} />);
  return <Fragment key={key}>{parts}</Fragment>;
}

async function renderBlock(block: Block, key: string, ctx: RenderContext): Promise<ReactNode> {
  switch (block.type) {
    case "richtext": return block.data ? await renderNode(block.data as Node, key, ctx) : null;
    case "html": return await renderHtml(String(block.data?.html ?? ""), key, ctx);
    default: {
      const Comp = await ctx.resolve.block(block.type);
      return Comp ? wrap(ctx, `Block ${block.type}`, key, <Comp block={block} data={block.data} site={ctx.site} post={ctx.post} />) : null;
    }
  }
}

function wrap(ctx: RenderContext, name: string, key: string, el: ReactNode): ReactNode {
  return ctx.boundary ? ctx.boundary(name, key, el) : <Fragment key={key}>{el}</Fragment>;
}

/**
 * Vẽ nội dung bài viết: chuẩn hoá theo định dạng của CMS (bài lưu bằng bản cũ được nâng cấp, cấu trúc hỏng bị bỏ),
 * rồi vẽ từng khối. Khối/nút của plugin không có renderer (plugin tắt) → bỏ qua, dữ liệu vẫn nguyên trong DB.
 */
export async function renderContent(content: ContentDoc | unknown, ctx: RenderContext, transform?: (blocks: Block[]) => Block[] | Promise<Block[]>): Promise<ReactNode[]> {
  const { doc } = normalizeContent(content, { blocks: ctx.blocks });
  const blocks = transform ? await transform(doc.blocks) : doc.blocks;
  return Promise.all(blocks.map((b, i) => renderBlock(b, b.id ?? `b${i}`, ctx)));
}
