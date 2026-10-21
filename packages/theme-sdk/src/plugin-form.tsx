import { getSite, pluginFetch } from "./api";
import { getT } from "./i18n";
import { PluginFormClient, type PluginFormField } from "./plugin-form-client";
import type { ShortcodeProps } from "./types";

/**
 * Form tự sinh cho bảng EF của plugin có [PublicCreate] (form liên hệ, đặt lịch, đăng ký…):
 *   <PluginForm plugin="lien-he" table="messages" />   — hoặc shortcode [cms-form plugin="lien-he" table="messages"]
 * Ô nhập, nhãn, ràng buộc lấy từ kiểu dữ liệu C# của plugin; máy chủ kiểm tra lại và giới hạn số lần gửi.
 * Class CSS: cms-form, cms-form-field, cms-form-{kiểu}, form-error, form-success.
 */
export async function PluginForm({ plugin, table, submitLabel, className }: { plugin: string; table: string; submitLabel?: string; className?: string }) {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(plugin) || !/^[a-z][a-z0-9_]*$/.test(table)) return null;
  const site = await getSite();
  const form = await pluginFetch<{ fields: PluginFormField[]; successMessage?: string | null }>(plugin, `/data/${table}/form`, { query: { lang: site.locale ?? site.language } })
    .catch(() => null);
  if (!form) return null;
  const t = await getT();
  return <PluginFormClient plugin={plugin} table={table} fields={form.fields} successMessage={form.successMessage} className={className}
    labels={{ submit: submitLabel ?? t("form.submit"), sending: t("form.sending"), error: t("form.error") }} />;
}

/** Shortcode có sẵn: [cms-form plugin="lien-he" table="messages" submit="Gửi liên hệ" class="…"]. */
export function CmsFormShortcode({ attrs }: ShortcodeProps) {
  return <PluginForm plugin={attrs.plugin ?? ""} table={attrs.table ?? ""} submitLabel={attrs.submit} className={attrs.class} />;
}
