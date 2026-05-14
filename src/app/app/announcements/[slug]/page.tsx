import { AnnouncementArticleEmbed } from "@/app/app/announcements/[slug]/announcement-article-embed";
import { RecordingPageAd } from "@/components/recording-page-ad";
import { appPath } from "@/lib/app-paths";
import {
  fetchHealthBlogPost,
  getHealthBlogOrigin,
  healthBlogEmbedUrl,
  healthBlogTrustedOrigin,
  pickPostMetaDescription,
  type HealthBlogPostDetail,
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
      <main className="mx-auto min-h-min w-full max-w-4xl px-4 py-6">
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
  const embedSrc = healthBlogEmbedUrl(slug);

  /* 見出し・公開日はブログ embed 側に任せ、ここでは重複表示しない */
  return (
    <main className="mx-auto min-h-min w-full max-w-4xl px-4 py-6">
      {embedSrc ? (
        <>
          <AnnouncementArticleEmbed
            src={embedSrc}
            title={title}
            trustedOrigin={healthBlogTrustedOrigin(getHealthBlogOrigin()!)}
          />
          {/*
            iframe 内は別オリジンのため広告は埋め込めない。
            記録ページと同じ AdSense ユニットを本文下に表示する。
          */}
          <RecordingPageAd />
        </>
      ) : (
        <p
          className="mt-6 text-sm text-[color:var(--hp-muted)]"
          role="alert"
        >
          埋め込み用のブログ起点（NEXT_PUBLIC_HEALTH_BLOG_ORIGIN）が未設定のため、本文
          iframe を表示できません。
        </p>
      )}
    </main>
  );
}
