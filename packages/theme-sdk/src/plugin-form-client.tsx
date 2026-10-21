"use client";

import { useState, type FormEvent } from "react";

export interface PluginFormField {
  key: string; type: string; label: string; required: boolean;
  maxLength?: number | null; minLength?: number | null; min?: string | null; max?: string | null; options?: string[] | null; pattern?: string | null; default?: unknown;
}
export interface PluginFormLabels { submit: string; sending: string; error: string }

/** Phần chạy trên trình duyệt của <PluginForm>: ô nhập, gửi, hiện lỗi theo từng ô (422) và lời cảm ơn. */
export function PluginFormClient({ plugin, table, fields, labels, successMessage, className }: {
  plugin: string; table: string; fields: PluginFormField[]; labels: PluginFormLabels; successMessage?: string | null; className?: string;
}) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; message?: string }>({ status: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const v = data.get(f.key);
      if (f.type === "boolean") body[f.key] = data.has(f.key);
      else if (v === null || v === "") body[f.key] = null;
      else if (f.type === "number") body[f.key] = Number(v);
      else if (f.type === "datetime") body[f.key] = new Date(String(v)).toISOString();
      else body[f.key] = String(v);
    }
    setState({ status: "sending" }); setErrors({});
    try {
      const res = await fetch(`/api/cms/plugins/${plugin}/data/${table}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors(json.errors ?? {}); setState({ status: "error", message: json.title ?? labels.error }); return; }
      form.reset();
      setState({ status: "done", message: json.message ?? successMessage ?? "" });
    } catch { setState({ status: "error", message: labels.error }); }
  }

  if (state.status === "done") return <p className="form-success" role="status">{state.message}</p>;
  return (
    <form className={["cms-form", className].filter(Boolean).join(" ")} onSubmit={submit} noValidate>
      {fields.map((f) => {
        const id = `cms-form-${plugin}-${table}-${f.key}`;
        const err = errors[f.key];
        const common = { id, name: f.key, required: f.required, "aria-invalid": err ? true : undefined, defaultValue: f.default == null ? undefined : String(f.default) };
        return (
          <p key={f.key} className={`cms-form-field cms-form-${f.type}`}>
            {f.type === "boolean"
              ? <label htmlFor={id}><input type="checkbox" id={id} name={f.key} defaultChecked={f.default === true} /> {f.label}</label>
              : <label htmlFor={id}>{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>}
            {f.type === "textarea" ? <textarea rows={5} maxLength={f.maxLength ?? undefined} {...common} />
              : f.type === "select" ? (
                <select {...common}>
                  {!f.required && <option value="">—</option>}
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>)
              : f.type !== "boolean" && <input {...common}
                  type={({ email: "email", tel: "tel", url: "url", number: "number", date: "date", time: "time", datetime: "datetime-local" } as Record<string, string>)[f.type] ?? "text"}
                  maxLength={f.maxLength ?? undefined} minLength={f.minLength ?? undefined} min={f.min ?? undefined} max={f.max ?? undefined} pattern={f.pattern ?? undefined} />}
            {err && <span className="form-error">{err.join(" ")}</span>}
          </p>
        );
      })}
      {state.status === "error" && <p className="form-error" role="alert">{state.message}</p>}
      <button type="submit" disabled={state.status === "sending"}>{state.status === "sending" ? labels.sending : labels.submit}</button>
    </form>
  );
}
