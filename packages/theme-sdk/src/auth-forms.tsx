"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createFetchKit, isFetchKitError } from "next-fetch-kit";
import { safeRedirect, type CurrentUser } from "./auth-shared";

/**
 * Form đăng nhập / đăng ký / quên mật khẩu của website. Gửi qua /api/cms/auth/* của frontend core —
 * token nằm trong cookie httpOnly, JavaScript của trang không bao giờ thấy.
 * Theme đặt các form này vào template riêng (login.tsx, register.tsx…) hoặc dùng trang có sẵn.
 */
const authApi = createFetchKit({ baseURL: "/api/cms/auth", timeout: 15_000 });

function errorMessage(e: unknown, fallback: string) {
  if (isFetchKitError(e)) {
    const d = e.data as { title?: string; errors?: Record<string, string[]> } | undefined;
    if (d?.errors) return Object.values(d.errors).flat().join(". ");
    return d?.title ?? fallback;
  }
  return (e as Error)?.message ?? fallback;
}

/** Tham số trên URL hiện tại (đọc sau khi hiển thị — trang có thể đã được cache tĩnh). */
function useQueryParam(name: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => { setValue(new URLSearchParams(window.location.search).get(name)); }, [name]);
  return value;
}

export const AUTH_LABELS = {
  login: "Tên đăng nhập hoặc email", password: "Mật khẩu", submitLogin: "Đăng nhập", code: "Mã xác thực (6 số)",
  verify: "Xác nhận", userName: "Tên đăng nhập", email: "Email", displayName: "Tên hiển thị", submitRegister: "Tạo tài khoản",
  submitForgot: "Gửi liên kết đặt lại", newPassword: "Mật khẩu mới (tối thiểu 10 ký tự)", submitReset: "Đặt mật khẩu",
  sending: "Đang xử lý…", error: "Có lỗi xảy ra, vui lòng thử lại", logout: "Đăng xuất",
  noAccount: "Chưa có tài khoản?", register: "Đăng ký", forgot: "Quên mật khẩu?", haveAccount: "Đã có tài khoản?", login2: "Đăng nhập",
  registerClosed: "Website hiện không mở đăng ký thành viên.", missingToken: "Liên kết không hợp lệ — hãy yêu cầu đặt lại mật khẩu lần nữa.",
};
export type AuthLabels = typeof AUTH_LABELS;

/**
 * Đường dẫn các trang tài khoản. Website nhiều ngôn ngữ truyền bản có tiền tố (localeHref(site, "/login") → "/en/login");
 * template có sẵn của SDK tự truyền.
 */
export interface AuthPaths { login: string; register: string; forgotPassword: string; home: string }
export const AUTH_PATHS: AuthPaths = { login: "/login", register: "/register", forgotPassword: "/forgot-password", home: "/" };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <p className="auth-field"><label>{label}{children}</label></p>;
}

function Status({ error, message }: { error?: string; message?: string }) {
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (message) return <p className="form-success" role="status">{message}</p>;
  return null;
}

/**
 * Đăng nhập (có bước mã 2 lớp nếu tài khoản bật). Xong thì chuyển tới ?redirect=… (chỉ đường dẫn nội bộ) hoặc <paramref name="redirectTo"/>.
 */
export function LoginForm({ redirectTo, labels, links = true, paths }: { redirectTo?: string; labels?: Partial<AuthLabels>; links?: boolean; paths?: Partial<AuthPaths> }) {
  const L = { ...AUTH_LABELS, ...labels };
  const P = { ...AUTH_PATHS, ...paths };
  const redirectParam = useQueryParam("redirect");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      type LoginReply = { user?: CurrentUser; twoFactorRequired?: boolean; challenge?: string };
      const { data } = challenge
        ? await authApi.post<LoginReply>("/2fa", { body: { challenge, code: fd.get("code") } })
        : await authApi.post<LoginReply>("/login", { body: { login: fd.get("login"), password: fd.get("password") } });
      if (data.twoFactorRequired && data.challenge) { setChallenge(data.challenge); setBusy(false); return; }
      // Tải lại hẳn trang đích: mọi Server Component đọc được cookie phiên mới
      window.location.assign(safeRedirect(redirectParam, redirectTo ?? P.home));
    } catch (err) {
      setError(errorMessage(err, L.error));
      setBusy(false);
    }
  }

  return (
    <form className="auth-form login-form" onSubmit={onSubmit}>
      {challenge ? (
        <Field label={L.code}><input name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={12} autoFocus /></Field>
      ) : (
        <>
          <Field label={L.login}><input name="login" autoComplete="username" required maxLength={200} /></Field>
          <Field label={L.password}><input name="password" type="password" autoComplete="current-password" required /></Field>
        </>
      )}
      <p><button type="submit" disabled={busy}>{busy ? L.sending : challenge ? L.verify : L.submitLogin}</button></p>
      <Status error={error} />
      {links && !challenge && (
        <p className="auth-links"><a href={P.forgotPassword}>{L.forgot}</a> · {L.noAccount} <a href={P.register}>{L.register}</a></p>
      )}
    </form>
  );
}

/** Đăng ký thành viên (chỉ khi quản trị viên bật "Ai cũng có thể đăng ký"). Vai trò = vai trò mặc định trong Cài đặt. */
export function RegisterForm({ labels, links = true, paths }: { labels?: Partial<AuthLabels>; links?: boolean; paths?: Partial<AuthPaths> }) {
  const L = { ...AUTH_LABELS, ...labels };
  const P = { ...AUTH_PATHS, ...paths };
  const [open, setOpen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    authApi.get<{ canRegister: boolean }>("/options").then(({ data }) => setOpen(data.canRegister)).catch(() => setOpen(false));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await authApi.post<{ message: string }>("/register", {
        body: { userName: fd.get("userName"), email: fd.get("email"), password: fd.get("password"), displayName: fd.get("displayName") || null },
      });
      form.reset();
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err, L.error));
    } finally {
      setBusy(false);
    }
  }

  if (open === false) return <p className="auth-form register-closed">{L.registerClosed}</p>;
  return (
    <form className="auth-form register-form" onSubmit={onSubmit}>
      <Field label={L.userName}><input name="userName" autoComplete="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9._\-]+" /></Field>
      <Field label={L.email}><input name="email" type="email" autoComplete="email" required maxLength={200} /></Field>
      <Field label={L.displayName}><input name="displayName" autoComplete="name" maxLength={100} /></Field>
      <Field label={L.password}><input name="password" type="password" autoComplete="new-password" required minLength={10} /></Field>
      <p><button type="submit" disabled={busy || open === null}>{busy ? L.sending : L.submitRegister}</button></p>
      <Status error={error} message={message} />
      {links && <p className="auth-links">{L.haveAccount} <a href={P.login}>{L.login2}</a></p>}
    </form>
  );
}

/** Gửi email đặt lại mật khẩu (liên kết trỏ về /reset-password của website). */
export function ForgotPasswordForm({ labels, paths }: { labels?: Partial<AuthLabels>; paths?: Partial<AuthPaths> }) {
  const L = { ...AUTH_LABELS, ...labels };
  const P = { ...AUTH_PATHS, ...paths };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await authApi.post<{ message: string }>("/forgot-password", { body: { login: fd.get("login") } });
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err, L.error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form forgot-form" onSubmit={onSubmit}>
      <Field label={L.login}><input name="login" autoComplete="username" required maxLength={200} /></Field>
      <p><button type="submit" disabled={busy}>{busy ? L.sending : L.submitForgot}</button></p>
      <Status error={error} message={message} />
      <p className="auth-links"><a href={P.login}>{L.login2}</a></p>
    </form>
  );
}

/** Đặt mật khẩu mới từ liên kết trong email (?token=…). */
export function ResetPasswordForm({ labels, paths }: { labels?: Partial<AuthLabels>; paths?: Partial<AuthPaths> }) {
  const L = { ...AUTH_LABELS, ...labels };
  const P = { ...AUTH_PATHS, ...paths };
  const token = useQueryParam("token");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const { data } = await authApi.post<{ message: string }>("/reset-password", { body: { token, password: fd.get("password") } });
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err, L.error));
    } finally {
      setBusy(false);
    }
  }

  if (token === "") return <p className="form-error">{L.missingToken}</p>;
  return (
    <form className="auth-form reset-form" onSubmit={onSubmit}>
      <Field label={L.newPassword}><input name="password" type="password" autoComplete="new-password" required minLength={10} /></Field>
      <p><button type="submit" disabled={busy || !token || !!message}>{busy ? L.sending : L.submitReset}</button></p>
      <Status error={error} message={message} />
      {message && <p className="auth-links"><a href={P.login}>{L.login2}</a></p>}
    </form>
  );
}

/** Nút đăng xuất: thu hồi phiên ở CMS, xoá cookie rồi chuyển về <paramref name="redirectTo"/>. */
export function LogoutButton({ redirectTo = "/", className, children }: { redirectTo?: string; className?: string; children?: ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={className ?? "logout-button"} disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await authApi.post("/logout"); } finally { window.location.assign(safeRedirect(redirectTo)); }
      }}>
      {children ?? AUTH_LABELS.logout}
    </button>
  );
}

/**
 * Người đang đăng nhập, dùng trong component client (null = khách, undefined = đang tải).
 * Server Component nên dùng getCurrentUser() để khỏi tốn thêm một request.
 */
export function useCurrentUser(): CurrentUser | null | undefined {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  useEffect(() => {
    authApi.get<{ user: CurrentUser | null }>("/me").then(({ data }) => setUser(data.user)).catch(() => setUser(null));
  }, []);
  return user;
}
