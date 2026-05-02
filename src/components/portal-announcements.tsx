"use client";

import { AnnouncementsList } from "@/app/app/announcements/announcements-list";
import {
  buildHealthBlogListProxyUrl,
  normalizeBlogPagination,
  type HealthBlogListResponse,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import { appPath } from "@/lib/app-paths";
import Link from "next/link";
import { useEffect, useState } from "react";

const PORTAL_PREVIEW_LIMIT = 5;

/** 一覧 JSON を正規化（{ posts } / { data: { posts } } 双方） */
function parseHealthBlogListResponse(raw: string): HealthBlogListResponse {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    return { posts: [] };
  }
  const o = parsed as Record<string, unknown>;
  if (Array.isArray(o.posts)) {
    return {
      posts: o.posts as HealthBlogPostListItem[],
      pagination: o.pagination as HealthBlogListResponse["pagination"],
    };
  }
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.posts)) {
      return {
        posts: d.posts as HealthBlogPostListItem[],
        pagination: d.pagination as HealthBlogListResponse["pagination"],
      };
    }
  }
  return { posts: [] };
}

/** ポータルページ先頭用：お知らせ一覧のプレビュー（同一ヘッダ配下） */
export function PortalAnnouncements() {
  const [posts, setPosts] = useState<HealthBlogPostListItem[]>([]);
  const [pagination, setPagination] = useState(() =>
    normalizeBlogPagination(undefined, 1),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /** /app/announcements の1ページ目と同一クエリ（limit 別指定は API によって 0 件になる例があったため、取得後に件数制限） */
    const url = buildHealthBlogListProxyUrl({ page: 1 });

    const ac = new AbortController();
    setLoading(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: ac.signal,
        });
        const raw = await res.text();

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

        const data = parseHealthBlogListResponse(raw);
        const list = data.posts ?? [];
        setPosts(list.slice(0, PORTAL_PREVIEW_LIMIT));
        setPagination(normalizeBlogPagination(data.pagination, 1));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setPosts([]);
        setPagination(normalizeBlogPagination(undefined, 1));
        setErrorMessage(
          "お知らせ一覧を取得できませんでした。しばらくしてから再度お試しください。",
        );
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

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
