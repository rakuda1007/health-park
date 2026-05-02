"use client";

import { AnnouncementArticleBody } from "@/app/app/announcements/[slug]/announcement-article-body";
import { AnnouncementArticleEmbed } from "@/app/app/announcements/[slug]/announcement-article-embed";
import { appPath } from "@/lib/app-paths";
import {
  buildHealthBlogPostProxyUrl,
  getHealthBlogOrigin,
  healthBlogEmbedUrl,
  pickPostBodyHtml,
  pickPublishedLabel,
  type HealthBlogPostDetail,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import Link from "next/link";
import { useEffect, useState } from "react";

function unwrapPostJson(json: unknown): HealthBlogPostDetail | null {
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

type LoadState =
  | { status: "loading" }
  | { status: "no_origin" }
  | { status: "missing" }
  | { status: "fetch_error" }
  | {
      status: "ok";
      post: HealthBlogPostDetail;
      embedSrc: string;
    };

export function AnnouncementArticlePageClient({ slug }: { slug: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!getHealthBlogOrigin()) {
      setState({ status: "no_origin" });
      return;
    }

    const embedSrc = healthBlogEmbedUrl(slug);

    if (!embedSrc) {
      setState({ status: "no_origin" });
      return;
    }

    const apiUrl = buildHealthBlogPostProxyUrl(slug);
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(apiUrl, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (res.status === 503) {
          if (!cancelled) {
            setState({ status: "no_origin" });
          }
          return;
        }
        if (res.status === 404) {
          if (!cancelled) {
            setState({ status: "missing" });
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json: unknown = await res.json();
        const post = unwrapPostJson(json);
        if (!cancelled) {
          if (!post || Object.keys(post).length === 0) {
            setState({ status: "missing" });
            return;
          }
          setState({
            status: "ok",
            post,
            embedSrc,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "fetch_error" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-[color:var(--hp-muted)]">読み込み中…</p>
      </main>
    );
  }

  if (state.status === "no_origin") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p
          className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-4 py-6 text-sm text-[color:var(--hp-muted)]"
          role="alert"
        >
          ブログ API の起点が未設定です。NEXT_PUBLIC_HEALTH_BLOG_ORIGIN を環境変数に設定して再デプロイしてください。
        </p>
        <p className="mt-4">
          <Link
            href={appPath("/announcements")}
            className="text-sm font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
          >
            お知らせ一覧へ
          </Link>
        </p>
      </main>
    );
  }

  if (state.status === "fetch_error") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p
          className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-4 py-6 text-sm text-[color:var(--hp-muted)]"
          role="alert"
        >
          記事を取得できませんでした。しばらくしてから再度お試しください。
        </p>
        <p className="mt-4">
          <Link
            href={appPath("/announcements")}
            className="text-sm font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
          >
            お知らせ一覧へ
          </Link>
        </p>
      </main>
    );
  }

  if (state.status === "missing") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 text-center">
        <h1 className="text-lg font-semibold text-[color:var(--hp-foreground)]">
          記事が見つかりません
        </h1>
        <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
          スラッグが違うか、公開が終了している可能性があります。
        </p>
        <p className="mt-6">
          <Link
            href={appPath("/announcements")}
            className="font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
          >
            お知らせ一覧へ
          </Link>
        </p>
      </main>
    );
  }

  const title = state.post.title?.trim() || slug;
  const dateLabel = pickPublishedLabel(state.post as HealthBlogPostListItem);
  const bodyHtml = pickPostBodyHtml(state.post);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4 border-b border-[color:var(--hp-border)] pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-[color:var(--hp-foreground)]">
          {title}
        </h1>
        {dateLabel ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">{dateLabel}</p>
        ) : null}
      </header>

      {bodyHtml ? (
        <AnnouncementArticleBody html={bodyHtml} />
      ) : (
        <AnnouncementArticleEmbed src={state.embedSrc} title={title} />
      )}
    </main>
  );
}
