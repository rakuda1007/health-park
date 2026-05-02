import { NextResponse } from "next/server";

export function blogOrigin(): string | null {
  const o = process.env.NEXT_PUBLIC_HEALTH_BLOG_ORIGIN?.trim();
  return o ? o.replace(/\/$/, "") : null;
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
