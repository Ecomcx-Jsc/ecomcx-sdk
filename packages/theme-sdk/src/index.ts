export * from "./types";
export * from "./api";
export * from "./utils";
export { definePlugin, getPlugin, hasPlugin, applyFilters, doAction, getSlotItems, getSlotComponents, getActiveTheme, getActiveExtensions, findShortcode, findWidget, findBlock, findRoute } from "./runtime";
export { PostContent } from "./content";
export { Img, imageCandidates, type ImgProps } from "./image";
export { Menu, WidgetArea, Slot, SearchForm, Pagination, FeaturedImage, PostDate, TermLinks, Comments, LanguageSwitcher } from "./components";
export { getT, BUILTIN as BUILTIN_STRINGS, type Translator } from "./i18n";
export { getRequestLocale, localeHref, LOCALE_HEADER } from "./locale";
export { CommentForm, CommentList, CommentsMore, ExtensionBoundary, PostPasswordForm, Link, isInternalHref, type LinkProps } from "./client";
export { getPreference } from "./preferences";
export { getCurrentUser, getAccessToken, requireUser, userCan, safeRedirect, ACCESS_COOKIE, REFRESH_COOKIE, type CurrentUser } from "./auth";
export { LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, LogoutButton, useCurrentUser, AUTH_LABELS, AUTH_PATHS, type AuthLabels, type AuthPaths } from "./auth-forms";
export { buildDocumentMetadata } from "./metadata";

/** Lấy giá trị Customizer của theme đang active. */
export async function getThemeSettings() {
  const { getSite } = await import("./api");
  return (await getSite()).themeSettings;
}
