import { type NextRequest, NextResponse } from "next/server";

/** ブログ公開サイトの `/api/blog` … と同等パスへサーバー側で転送（ブラウザは同一オリジンのみ）。 */

function blogOrigin(): string | null {
  const o = process.env.NEXT_PUBLIC_HEALTH_BLOG_ORIGIN?.trim();
  return o ? o.replace(/\/$/, "") : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const origin = blogOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_HEALTH_BLOG_ORIGIN is not set" },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const segments = path ?? [];
  const suffix =
    segments.length > 0
      ? `/${segments.map((s) => encodeURIComponent(s)).join("/")}`
      : "";

  const target = new URL(`${origin}/api/blog${suffix}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const res = await fetch(target, {
    headers: { Accept: "application/json" },
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
}
