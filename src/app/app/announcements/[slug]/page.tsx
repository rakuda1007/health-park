import { AnnouncementArticleBody } from "@/app/app/announcements/[slug]/announcement-article-body";
import { AnnouncementArticleEmbed } from "@/app/app/announcements/[slug]/announcement-article-embed";
import { appPath } from "@/lib/app-paths";
import {
  fetchHealthBlogPost,
  getHealthBlogOrigin,
  healthBlogEmbedUrl,
  pickPostBodyHtml,
  pickPostMetaDescription,
  pickPublishedLabel,
  type HealthBlogPostDetail,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);

  if (!getHealthBlogOrigin()) {
    return { title: "記事" };
  }

  const post = await fetchHealthBlogPost(slug);
  if (!post || Object.keys(post).length === 0) {
    return {
      title: "記事が見つかりません",
      robots: { index: false, follow: true },
    };
  }

  const title = post.title?.trim() || slug;
  const description = pickPostMetaDescription(post);
  const path = appPath(`/announcements/${slug}`);
  const published = post.publishedAt ?? post.published_at;

  return {
    title,
    description: description ?? undefined,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description: description ?? undefined,
      type: "article",
      url: path,
      ...(published ? { publishedTime: published } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function AnnouncementArticlePage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);

  if (!getHealthBlogOrigin()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p
          className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-4 py-6 text-sm text-[color:var(--hp-muted)]"
          role="alert"
        >
          ブログ API の起点が未設定です。NEXT_PUBLIC_HEALTH_BLOG_ORIGIN
          を環境変数に設定して再デプロイしてください。
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

  const post: HealthBlogPostDetail | null = await fetchHealthBlogPost(slug);

  if (!post || Object.keys(post).length === 0) {
    notFound();
  }

  const title = post.title?.trim() || slug;
  const dateLabel = pickPublishedLabel(post as HealthBlogPostListItem);
  const bodyHtml = pickPostBodyHtml(post);
  const embedSrc = healthBlogEmbedUrl(slug);

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
      ) : embedSrc ? (
        <AnnouncementArticleEmbed src={embedSrc} title={title} />
      ) : (
        <p
          className="mt-6 text-sm text-[color:var(--hp-muted)]"
          role="alert"
        >
          本文を表示できません。ブログ API の応答を確認してください。
        </p>
      )}
    </main>
  );
}
