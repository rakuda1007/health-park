import { AnnouncementArticleEmbed } from "@/app/app/announcements/[slug]/announcement-article-embed";
import { appPath } from "@/lib/app-paths";
import {
  fetchHealthBlogPost,
  getHealthBlogOrigin,
  healthBlogCanonicalPostUrl,
  healthBlogEmbedUrl,
  pickPublishedLabel,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  if (!getHealthBlogOrigin()) {
    return { title: "お知らせ" };
  }
  const post = await fetchHealthBlogPost(slug);
  const title = post?.title?.trim() || slug;
  const rawContent = post?.content;
  const plain =
    typeof rawContent === "string"
      ? rawContent.replace(/<[^>]+>/g, "").trim()
      : "";
  return {
    title,
    description: plain ? plain.slice(0, 160) : undefined,
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
          ブログ API の起点が未設定です。NEXT_PUBLIC_HEALTH_BLOG_ORIGIN を
          .env.local に設定してください。
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

  let post: Awaited<ReturnType<typeof fetchHealthBlogPost>>;
  try {
    post = await fetchHealthBlogPost(slug);
  } catch {
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

  if (!post) {
    notFound();
  }

  const title = post.title?.trim() || slug;
  const embedSrc = healthBlogEmbedUrl(slug);
  const canonical = healthBlogCanonicalPostUrl(slug);
  const dateLabel = pickPublishedLabel(post as HealthBlogPostListItem);

  if (!embedSrc) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-sm text-[color:var(--hp-muted)]">
          埋め込み URL を組み立てられませんでした。
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <nav className="mb-6 text-sm">
        <Link
          href={appPath("/announcements")}
          className="font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
        >
          ← お知らせ一覧
        </Link>
      </nav>

      <header className="mb-4 border-b border-[color:var(--hp-border)] pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-[color:var(--hp-foreground)]">
          {title}
        </h1>
        {dateLabel ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">{dateLabel}</p>
        ) : null}
        {canonical ? (
          <p className="mt-3">
            <a
              href={canonical}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[color:var(--hp-accent)] underline-offset-4 hover:underline"
            >
              ブラウザで開く（共有・検索用の正規ページ）
            </a>
          </p>
        ) : null}
      </header>

      <AnnouncementArticleEmbed src={embedSrc} title={title} />
    </main>
  );
}
