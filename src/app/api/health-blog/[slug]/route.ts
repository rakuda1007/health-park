import { type NextRequest, NextResponse } from "next/server";
import {
  blogOrigin,
  forwardToBlog,
  misconfiguredSelfOriginResponse,
} from "@/app/api/health-blog/_proxy";

/** GET /api/health-blog/[slug] → ブログ GET /api/blog/[slug] */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const origin = blogOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_HEALTH_BLOG_ORIGIN is not set" },
      { status: 503 },
    );
  }

  const selfCheck = misconfiguredSelfOriginResponse(request, origin);
  if (selfCheck) {
    return selfCheck;
  }

  const { slug: raw } = await context.params;
  const slug = decodeURIComponent(raw);
  const target = new URL(`${origin}/api/blog/${encodeURIComponent(slug)}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return forwardToBlog(target);
}
