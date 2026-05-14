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

function hostLooksUnsuitableForPublicOg(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.endsWith(".run.app") ||
    h === "localhost" ||
    h.startsWith("127.0.0.1")
  );
}

/**
 * リクエストの Host から公開用 origin を推測する（SITE_URL 未設定時のフォールバック）。
 * ブログ用プロキシ等の *.run.app は OGP の canonical に使わない。
 */
export function getRequestDerivedPublicOrigin(headerList: Headers): string | null {
  const rawHost =
    headerList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerList.get("host")?.trim();
  if (!rawHost || hostLooksUnsuitableForPublicOg(rawHost)) {
    return null;
  }
  const rawProto =
    headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const proto =
    rawProto === "http" || rawProto === "https" ? rawProto : "https";
  try {
    return new URL(`${proto}://${rawHost}`).origin;
  } catch {
    return null;
  }
}

/** お知らせ詳細の metadataBase / og:url 用。SITE_URL を優先し、無ければ Host（内部ホストは除外） */
export function getAnnouncementMetadataOrigin(headerList: Headers): string | null {
  return getPublicSiteOrigin() ?? getRequestDerivedPublicOrigin(headerList);
}

/** シェアボタン・canonical 用の記事ページ絶対 URL */
export function getAnnouncementAbsolutePageUrl(
  headerList: Headers,
  path: string,
): string | null {
  const origin = getAnnouncementMetadataOrigin(headerList);
  if (!origin) {
    return null;
  }
  return toAbsolutePublicUrlFromOrigin(origin, path);
}

export function toAbsolutePublicUrlFromOrigin(
  origin: string,
  path: string,
): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

/** 公開サイト上の絶対 URL（NEXT_PUBLIC_SITE_URL のみ使用） */
export function toAbsolutePublicUrl(path: string): string | null {
  const origin = getPublicSiteOrigin();
  if (!origin) {
    return null;
  }
  return toAbsolutePublicUrlFromOrigin(origin, path);
}
