import { type NextRequest, NextResponse } from "next/server";
import { blogOrigin, forwardToBlog } from "@/app/api/health-blog/_proxy";

/** GET /api/health-blog → ブログ GET /api/blog（一覧） */
export async function GET(request: NextRequest) {
  const origin = blogOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_HEALTH_BLOG_ORIGIN is not set" },
      { status: 503 },
    );
  }

  const target = new URL(`${origin}/api/blog`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return forwardToBlog(target);
}
