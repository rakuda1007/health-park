"use client";

import { AnnouncementsList } from "@/app/app/announcements/announcements-list";
import {
  buildHealthBlogListProxyUrl,
  getHealthBlogListTag,
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
    const url = buildHealthBlogListProxyUrl({
      page: currentPage,
      tag: listTag,
    });

    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const raw = await res.text();
        if (cancelled) {
          return;
        }

        if (res.status === 503) {
          setPosts([]);
          setPagination(normalizeBlogPagination(undefined, currentPage));
          setErrorMessage(
            "ブログ API の起点が未設定です。NEXT_PUBLIC_HEALTH_BLOG_ORIGIN を環境変数に設定して再デプロイしてください。",
          );
          return;
        }

        if (!res.ok) {
          let detail: string | null = null;
          try {
            const j = JSON.parse(raw) as { message?: string };
            detail = typeof j.message === "string" ? j.message : null;
          } catch {
            /* 本文が JSON でない場合 */
          }
          setPosts([]);
          setPagination(normalizeBlogPagination(undefined, currentPage));
          setErrorMessage(
            detail ??
              `お知らせ一覧を取得できませんでした（HTTP ${res.status}）。`,
          );
          return;
        }

        const data = JSON.parse(raw) as HealthBlogListResponse;
        setPosts(data.posts ?? []);
        setPagination(normalizeBlogPagination(data.pagination, currentPage));
      } catch {
        if (cancelled) {
          return;
        }
        setPosts([]);
        setPagination(normalizeBlogPagination(undefined, currentPage));
        setErrorMessage(
          "お知らせ一覧を取得できませんでした。しばらくしてから再度お試しください。",
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
