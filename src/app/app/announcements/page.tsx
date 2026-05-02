import { AnnouncementsList } from "@/app/app/announcements/announcements-list";
import {
  fetchHealthBlogPosts,
  getHealthBlogListTag,
  getHealthBlogOrigin,
  normalizeBlogPagination,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お知らせ",
};

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AnnouncementsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const pageRaw = sp.page;
  const currentPage = Math.max(
    1,
    Number.parseInt(pageRaw ?? "1", 10) || 1,
  );

  const originConfigured = Boolean(getHealthBlogOrigin());
  const listTag = getHealthBlogListTag();

  let errorMessage: string | null = null;
  let posts: HealthBlogPostListItem[] = [];
  let pagination = normalizeBlogPagination(undefined, currentPage);

  if (!originConfigured) {
    errorMessage =
      "ブログ API の起点が未設定です。NEXT_PUBLIC_HEALTH_BLOG_ORIGIN を .env.local に設定してください。";
  } else {
    try {
      const data = await fetchHealthBlogPosts({
        page: currentPage,
        tag: listTag,
      });
      if (data) {
        posts = data.posts ?? [];
        pagination = normalizeBlogPagination(
          data.pagination,
          currentPage,
        );
      }
    } catch {
      errorMessage =
        "お知らせ一覧を取得できませんでした。しばらくしてから再度お試しください。";
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-[color:var(--hp-foreground)]">
          お知らせ
        </h1>
        <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
          Health Park に関するお知らせ・コラムです。
        </p>
      </header>

      <AnnouncementsList
        posts={posts}
        pagination={pagination}
        currentPage={currentPage}
        errorMessage={errorMessage}
      />
    </main>
  );
}
