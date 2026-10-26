import { appPath } from "@/lib/app-paths";
import {
  fetchHealthBlogPosts,
  getHealthBlogOrigin,
  normalizeBlogPagination,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import {
  getPublicSiteOrigin,
  toAbsolutePublicUrlFromOrigin,
} from "@/lib/site-metadata";
import type { MetadataRoute } from "next";

/** NEXT_PUBLIC_SITE_URL も VERCEL_URL も無いときの公開ドメイン */
const FALLBACK_SITE_ORIGIN = "https://health.tennis-park-community.com";

/** 一覧 API を何ページまで辿るか（無限ループ防止） */
const MAX_LIST_PAGES = 20;
const LIST_PAGE_SIZE = 100;

/**
 * sitemap の絶対 URL 用 origin。
 * OGP と同じく NEXT_PUBLIC_SITE_URL を優先し、内部ホスト（*.run.app 等）は使わない。
 */
function getSitemapOrigin(): string {
  const fromSiteUrl = getPublicSiteOrigin();
  if (fromSiteUrl) {
    return fromSiteUrl;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`).origin;
    } catch {
      /* 不正な VERCEL_URL はフォールバックへ */
    }
  }
  return FALLBACK_SITE_ORIGIN;
}

function postLastModified(post: HealthBlogPostListItem): Date | undefined {
  const raw = post.publishedAt ?? post.published_at ?? post.date;
  if (!raw) {
    return undefined;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** 公開お知らせをページングして集める。取得失敗時は空（静的 URL だけ返す）。 */
async function listAnnouncementPosts(): Promise<HealthBlogPostListItem[]> {
  if (!getHealthBlogOrigin()) {
    return [];
  }

  const bySlug = new Map<string, HealthBlogPostListItem>();
  for (let page = 1; page <= MAX_LIST_PAGES; page += 1) {
    let response;
    try {
      response = await fetchHealthBlogPosts({ page, limit: LIST_PAGE_SIZE });
    } catch (error) {
      console.error("[sitemap] announcement list failed", error);
      break;
    }
    if (!response?.posts?.length) {
      break;
    }
    for (const post of response.posts) {
      const slug = post.slug?.trim();
      if (slug) {
        bySlug.set(slug, post);
      }
    }
    const { totalPages } = normalizeBlogPagination(response.pagination, page);
    if (page >= totalPages) {
      break;
    }
  }
  return [...bySlug.values()];
}

/** 検索向けの公開 URL。記録画面（体重・血圧など）とログインは含めない。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSitemapOrigin();
  const entries: MetadataRoute.Sitemap = [
    {
      url: toAbsolutePublicUrlFromOrigin(origin, "/portal"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: toAbsolutePublicUrlFromOrigin(origin, appPath("/announcements")),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  const posts = await listAnnouncementPosts();
  for (const post of posts) {
    const slug = post.slug.trim();
    const lastModified = postLastModified(post);
    entries.push({
      url: toAbsolutePublicUrlFromOrigin(
        origin,
        appPath(`/announcements/${encodeURIComponent(slug)}`),
      ),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}

export const revalidate = 3600;
