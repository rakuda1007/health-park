import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** 移行前のブックマーク用: 旧トップレベル → `/app` 配下へ */
const LEGACY_APP_SEGMENTS = new Set([
  "appointments",
  "backup",
  "blood-pressure",
  "clinics",
  "dashboard",
  "login",
  "meals",
  "medical-history",
  "prescriptions",
  "reflection",
  "settings",
  "steps",
  "weight",
]);

/**
 * App Hosting / CDN が HTML を長くキャッシュすると、デプロイ直後も古い画面（ログイン非表示など）が残ることがある。
 * ページ HTML には再検証を促すヘッダーを付与する（静的アセットは matcher で除外）。
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && LEGACY_APP_SEGMENTS.has(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/app${pathname}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
