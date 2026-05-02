"use client";

import { AnnouncementsList } from "@/app/app/announcements/announcements-list";
import {
  buildHealthBlogListProxyUrl,
  getHealthBlogListTag,
  normalizeBlogPagination,
  type HealthBlogListResponse,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import { appPath } from "@/lib/app-paths";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PORTAL_PREVIEW_LIMIT = 5;

/** ポータルページ先頭用：お知らせ一覧のプレビュー（同一ヘッダ配下） */
export function PortalAnnouncements() {
  const listTag = useMemo(() => getHealthBlogListTag(), []);
  const [posts, setPosts] = useState<HealthBlogPostListItem[]>([]);
  const [pagination, setPagination] = useState(() =>
    normalizeBlogPagination(undefined, 1),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = buildHealthBlogListProxyUrl({
      page: 1,
      tag: listTag,
      limit: PORTAL_PREVIEW_LIMIT,
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
          setPagination(normalizeBlogPagination(undefined, 1));
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
            /* ignore */
          }
          setPosts([]);
          setPagination(normalizeBlogPagination(undefined, 1));
          setErrorMessage(
            detail ??
              `お知らせ一覧を取得できませんでした（HTTP ${res.status}）。`,
          );
          return;
        }

        const data = JSON.parse(raw) as HealthBlogListResponse;
        setPosts(data.posts ?? []);
        setPagination(normalizeBlogPagination(data.pagination, 1));
      } catch {
        if (cancelled) {
          return;
        }
        setPosts([]);
        setPagination(normalizeBlogPagination(undefined, 1));
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
  }, [listTag]);

  return (
    <section
      id="announcements"
      className="scroll-mt-28 rounded-3xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-5 py-8 shadow-sm sm:px-8"
      aria-labelledby="portal-announcements-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 gap-y-2">
        <div>
          <h2
            id="portal-announcements-heading"
            className="text-xl font-semibold text-[color:var(--hp-foreground)] sm:text-2xl"
          >
            お知らせ
          </h2>
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            Health Park に関するお知らせ・コラムです。
          </p>
        </div>
        <Link
          href={appPath("/announcements")}
          className="shrink-0 text-sm font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
        >
          一覧を見る
        </Link>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="rounded-lg border border-dashed border-[color:var(--hp-border)] px-4 py-8 text-center text-sm text-[color:var(--hp-muted)]">
            読み込み中…
          </p>
        ) : (
          <AnnouncementsList
            posts={posts}
            pagination={pagination}
            currentPage={1}
            errorMessage={errorMessage}
            hidePagination
          />
        )}
      </div>
    </section>
  );
}
