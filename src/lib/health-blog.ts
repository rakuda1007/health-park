/**
 * ヘルス用ブログ公開ドメイン上の REST API（NEXT_PUBLIC_HEALTH_BLOG_ORIGIN）。
 * GET /api/blog … 一覧、GET /api/blog/[slug] … 単票（メタデータ用）
 */

const DEFAULT_LIST_LIMIT = 10;

export type HealthBlogPagination = {
  page: number;
  totalPages?: number;
  total_pages?: number;
  limit?: number;
  total?: number;
};

/** 一覧 API の投稿要素（フィールド名は API 実装差を吸収） */
export type HealthBlogPostListItem = {
  slug: string;
  title?: string;
  publishedAt?: string;
  published_at?: string;
  date?: string;
  excerpt?: string;
  summary?: string;
  description?: string;
};

export type HealthBlogListResponse = {
  posts: HealthBlogPostListItem[];
  pagination?: HealthBlogPagination;
};

export type HealthBlogPostDetail = {
  slug?: string;
  title?: string;
  publishedAt?: string;
  published_at?: string;
  content?: string;
};

export function getHealthBlogOrigin(): string | null {
  const o = process.env.NEXT_PUBLIC_HEALTH_BLOG_ORIGIN?.trim();
  return o || null;
}

/** 一覧の tag クエリ用（未設定ならフィルタなし） */
export function getHealthBlogListTag(): string | undefined {
  const t = process.env.NEXT_PUBLIC_HEALTH_BLOG_TAG?.trim();
  return t || undefined;
}

export function normalizeBlogPagination(
  raw: HealthBlogPagination | undefined,
  fallbackPage: number,
): { page: number; totalPages: number } {
  const page = raw?.page ?? fallbackPage;
  const totalPages = raw?.totalPages ?? raw?.total_pages ?? 1;
  return { page, totalPages: Math.max(1, totalPages) };
}

export function pickPublishedLabel(post: HealthBlogPostListItem): string | null {
  const raw =
    post.publishedAt ??
    post.published_at ??
    post.date ??
    undefined;
  if (!raw) {
    return null;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return raw;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
  }).format(d);
}

export function pickExcerpt(post: HealthBlogPostListItem): string | undefined {
  const x = post.excerpt ?? post.summary ?? post.description;
  return typeof x === "string" && x.trim() ? x.trim() : undefined;
}

export async function fetchHealthBlogPosts(options: {
  page?: number;
  limit?: number;
  tag?: string;
}): Promise<HealthBlogListResponse | null> {
  const origin = getHealthBlogOrigin();
  if (!origin) {
    return null;
  }

  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams();
  const page = options.page ?? 1;
  params.set("page", String(page));
  params.set("limit", String(options.limit ?? DEFAULT_LIST_LIMIT));
  if (options.tag) {
    params.set("tag", options.tag);
  }
  params.set("sortBy", "publishedAt");
  params.set("sortOrder", "desc");

  const url = `${base}/api/blog?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Blog list API error: ${res.status}`);
  }
  return (await res.json()) as HealthBlogListResponse;
}

export async function fetchHealthBlogPost(
  slug: string,
): Promise<HealthBlogPostDetail | null> {
  const origin = getHealthBlogOrigin();
  if (!origin) {
    return null;
  }
  const base = origin.replace(/\/$/, "");
  const url = `${base}/api/blog/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    return null;
  }
  const json: unknown = await res.json();
  if (json && typeof json === "object") {
    if ("post" in json && json.post && typeof json.post === "object") {
      return json.post as HealthBlogPostDetail;
    }
    if ("data" in json && json.data && typeof json.data === "object") {
      return json.data as HealthBlogPostDetail;
    }
  }
  return json as HealthBlogPostDetail;
}

export function healthBlogEmbedUrl(slug: string): string | null {
  const origin = getHealthBlogOrigin();
  if (!origin) {
    return null;
  }
  const base = origin.replace(/\/$/, "");
  return `${base}/blog/embed/${encodeURIComponent(slug)}`;
}

export function healthBlogCanonicalPostUrl(slug: string): string | null {
  const origin = getHealthBlogOrigin();
  if (!origin) {
    return null;
  }
  const base = origin.replace(/\/$/, "");
  return `${base}/blog/${encodeURIComponent(slug)}`;
}
