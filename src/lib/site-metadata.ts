/**
 * SNS（Facebook 等）のリンクプレビュー用。
 * デプロイ先の内部 URL（*.run.app 等）ではなく、ブラウザで案内する公開ドメインだけを使う。
 */

/** NEXT_PUBLIC_SITE_URL から origin のみ（末尾スラッシュなし） */
export function getPublicSiteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return null;
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null;
    }
    return u.origin;
  } catch {
    return null;
  }
}

/** 公開サイト上の絶対 URL（例: /app/announcements/foo → https://health.../app/announcements/foo） */
export function toAbsolutePublicUrl(path: string): string | null {
  const origin = getPublicSiteOrigin();
  if (!origin) {
    return null;
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}
