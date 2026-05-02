import { type NextRequest, NextResponse } from "next/server";

export function blogOrigin(): string | null {
  const o = process.env.NEXT_PUBLIC_HEALTH_BLOG_ORIGIN?.trim();
  return o ? o.replace(/\/$/, "") : null;
}

/**
 * ORIGIN を誤って Health Park 自身のドメインにすると、プロキシが /api/blog を
 * このアプリ内に取りに行き存在しないため HTTP 404 になる。
 */
export function misconfiguredSelfOriginResponse(
  request: NextRequest,
  originUrl: string,
): NextResponse | null {
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!hostHeader) {
    return null;
  }
  const requestHost = hostHeader.split(",")[0]?.trim().toLowerCase();
  try {
    const o = new URL(originUrl.includes("://") ? originUrl : `https://${originUrl}`);
    if (o.hostname.toLowerCase() === requestHost) {
      return NextResponse.json(
        {
          error: "misconfigured_origin",
          message:
            "NEXT_PUBLIC_HEALTH_BLOG_ORIGIN が Health Park 自身の URL になっています。ブログ専用ドメイン（例: https://blog-health.tennis-park-community.com、末尾スラッシュなし）に直して再デプロイしてください。",
        },
        { status: 503 },
      );
    }
  } catch {
    return null;
  }
  return null;
}

/** ブログ API へのサーバー間転送（User-Agent なしだと WAF に弾かれることがある） */
export async function forwardToBlog(target: URL): Promise<NextResponse> {
  try {
    const res = await fetch(target, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "HealthPark/1.0 (announcements-proxy; +https://health.tennis-park-community.com)",
      },
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type":
          res.headers.get("Content-Type") ?? "application/json; charset=utf-8",
      },
    });
  } catch (e) {
    console.error("[health-blog proxy] upstream fetch failed", e);
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        message:
          "ブログ API に接続できませんでした。ネットワークまたはブログ側の許可設定を確認してください。",
      },
      { status: 502 },
    );
  }
}
