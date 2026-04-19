import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * App Hosting / CDN が HTML を長くキャッシュすると、デプロイ直後も古い画面（ログイン非表示など）が残ることがある。
 * ページ HTML には再検証を促すヘッダーを付与する（静的アセットは matcher で除外）。
 */
export function middleware(request: NextRequest) {
  void request;
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
