/**
 * 記録アプリの URL プレフィックス（ルート `/` はポータル）。
 * 未ログインでも IndexedDB 利用可能な領域。
 */
export const APP_BASE = "/app" as const;

/** `/dashboard` → `/app/dashboard` */
export function appPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return APP_BASE;
  }
  return `${APP_BASE}${normalized}`;
}
