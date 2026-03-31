/**
 * Etter innlogging: kun tillat relative stier innenfor denne appen.
 * Blokkerer f.eks. /admin (north-of-hell) og åpne redirects (//evil.com).
 */
export function safeLoginRedirect(next: string | null | undefined): string {
  if (!next?.trim()) return "/";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";

  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (pathOnly === "/admin" || pathOnly.startsWith("/admin/")) {
    return "/";
  }

  return trimmed;
}
