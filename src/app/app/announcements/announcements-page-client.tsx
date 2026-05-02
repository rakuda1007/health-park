"use client";

import { AnnouncementsList } from "@/app/app/announcements/announcements-list";
import {
  buildHealthBlogListUrl,
  getHealthBlogListTag,
  getHealthBlogOrigin,
  normalizeBlogPagination,
  type HealthBlogListResponse,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function AnnouncementsPageClient() {
  const searchParams = useSearchParams();
  const currentPage = useMemo(() => {
    const raw = searchParams.get("page");
    return Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
  }, [searchParams]);

  const listTag = useMemo(() => getHealthBlogListTag(), []);

  const [posts, setPosts] = useState<HealthBlogPostListItem[]>([]);
  const [pagination, setPagination] = useState(() =>
    normalizeBlogPagination(undefined, currentPage),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const originConfigured = Boolean(getHealthBlogOrigin());
    if (!originConfigured) {
      setLoading(false);
      setErrorMessage(
        "ブログ API の起点が未設定です。NEXT_PUBLIC_HEALTH_BLOG_ORIGIN を環境変数に設定して再デプロイしてください。",
      );
      setPosts([]);
      return;
    }

    const url = buildHealthBlogListUrl({
      page: currentPage,
      tag: listTag,
    });
    if (!url) {
      setLoading(false);
      setErrorMessage(
        "ブログ API の起点が未設定です。NEXT_PUBLIC_HEALTH_BLOG_ORIGIN を環境変数に設定して再デプロイしてください。",
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "omit",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as HealthBlogListResponse;
        if (cancelled) {
          return;
        }
        setPosts(data.posts ?? []);
        setPagination(normalizeBlogPagination(data.pagination, currentPage));
      } catch {
        if (cancelled) {
          return;
        }
        setPosts([]);
        setPagination(normalizeBlogPagination(undefined, currentPage));
        setErrorMessage(
          "お知らせ一覧を取得できませんでした。ネットワークかブログ側の CORS 設定（このサイトのオリジンを許可）を確認してください。",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPage, listTag]);

  if (loading) {
    return (
      <p className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-4 py-8 text-center text-sm text-[color:var(--hp-muted)]">
        読み込み中…
      </p>
    );
  }

  return (
    <AnnouncementsList
      posts={posts}
      pagination={pagination}
      currentPage={currentPage}
      errorMessage={errorMessage}
    />
  );
}
