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

/** 一覧の category クエリ用（未設定ならフィルタなし）。ブログが「公開先」をカテゴリで表す場合に使用。 */
export function getHealthBlogListCategory(): string | undefined {
  const c = process.env.NEXT_PUBLIC_HEALTH_BLOG_CATEGORY?.trim();
  return c || undefined;
}

/** 一覧の publicationTarget クエリ（ブログ API が対応している場合）。記事 JSON の公開先と対応。 */
export function getHealthBlogPublicationTarget(): string | undefined {
  const p = process.env.NEXT_PUBLIC_HEALTH_BLOG_PUBLICATION_TARGET?.trim();
  return p || undefined;
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

/** ブラウザから直接叩く用の一覧 URL（サーバー fetch がブロックされる環境向け） */
export function buildHealthBlogListUrl(options: {
  page?: number;
  limit?: number;
  tag?: string;
  category?: string;
  publicationTarget?: string;
}): string | null {
  const origin = getHealthBlogOrigin();
  if (!origin) {
    return null;
  }
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams();
  const page = options.page ?? 1;
  params.set("page", String(page));
  params.set("limit", String(options.limit ?? DEFAULT_LIST_LIMIT));
  const tag = options.tag ?? getHealthBlogListTag();
  if (tag) {
    params.set("tag", tag);
  }
  const category = options.category ?? getHealthBlogListCategory();
  if (category) {
    params.set("category", category);
  }
  const publicationTarget =
    options.publicationTarget ?? getHealthBlogPublicationTarget();
  if (publicationTarget) {
    params.set("publicationTarget", publicationTarget);
  }
  params.set("sortBy", "publishedAt");
  params.set("sortOrder", "desc");
  return `${base}/api/blog?${params.toString()}`;
}

/** 単票 API の URL（クライアント fetch 用） */
export function buildHealthBlogPostApiUrl(slug: string): string | null {
  const origin = getHealthBlogOrigin();
  if (!origin) {
    return null;
  }
  const base = origin.replace(/\/$/, "");
  return `${base}/api/blog/${encodeURIComponent(slug)}`;
}

/**
 * Health Park 同一オリジンのプロキシ（CORS 不要）。`/api/health-blog` → ブログ `/api/blog`
 * `tag` / `category` / `publicationTarget` は未指定なら `.env` の `NEXT_PUBLIC_HEALTH_BLOG_*` を付与。
 */
export function buildHealthBlogListProxyUrl(options: {
  page?: number;
  limit?: number;
} = {}): string {
  const params = new URLSearchParams();
  const page = options.page ?? 1;
  params.set("page", String(page));
  params.set("limit", String(options.limit ?? DEFAULT_LIST_LIMIT));
  const tag = getHealthBlogListTag();
  if (tag) {
    params.set("tag", tag);
  }
  const category = getHealthBlogListCategory();
  if (category) {
    params.set("category", category);
  }
  const publicationTarget = getHealthBlogPublicationTarget();
  if (publicationTarget) {
    params.set("publicationTarget", publicationTarget);
  }
  params.set("sortBy", "publishedAt");
  params.set("sortOrder", "desc");
  return `/api/health-blog?${params.toString()}`;
}

export function buildHealthBlogPostProxyUrl(slug: string): string {
  return `/api/health-blog/${encodeURIComponent(slug)}`;
}

export async function fetchHealthBlogPosts(options: {
  page?: number;
  limit?: number;
  tag?: string;
  category?: string;
  publicationTarget?: string;
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
  const tag = options.tag ?? getHealthBlogListTag();
  if (tag) {
    params.set("tag", tag);
  }
  const category = options.category ?? getHealthBlogListCategory();
  if (category) {
    params.set("category", category);
  }
  const publicationTarget =
    options.publicationTarget ?? getHealthBlogPublicationTarget();
  if (publicationTarget) {
    params.set("publicationTarget", publicationTarget);
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
