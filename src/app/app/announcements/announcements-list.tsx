import { appPath } from "@/lib/app-paths";
import {
  normalizeBlogPagination,
  pickExcerpt,
  pickPublishedLabel,
  type HealthBlogPostListItem,
} from "@/lib/health-blog";
import Link from "next/link";

type AnnouncementsListProps = {
  posts: HealthBlogPostListItem[];
  pagination: ReturnType<typeof normalizeBlogPagination>;
  currentPage: number;
  errorMessage?: string | null;
  /** ポータルプレビューなどでページ送りを出さない */
  hidePagination?: boolean;
};

export function AnnouncementsList({
  posts,
  pagination,
  currentPage,
  errorMessage,
  hidePagination = false,
}: AnnouncementsListProps) {
  if (errorMessage) {
    return (
      <div
        className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-4 py-6 text-sm text-[color:var(--hp-muted)]"
        role="alert"
      >
        {errorMessage}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-4 py-10 text-center text-sm text-[color:var(--hp-muted)]">
        お知らせはまだありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {posts.map((post) => {
          const slug = post.slug;
          const title = post.title?.trim() || slug;
          const dateLabel = pickPublishedLabel(post);
          const excerpt = pickExcerpt(post);

          return (
            <li key={slug}>
              <article className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] transition-colors hover:border-[color:var(--hp-accent)]/30">
                <Link
                  href={appPath(`/announcements/${encodeURIComponent(slug)}`)}
                  className="block px-4 py-4 no-underline"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h2 className="text-base font-semibold text-[color:var(--hp-foreground)]">
                      {title}
                    </h2>
                    {dateLabel ? (
                      <time
                        className="shrink-0 text-xs text-[color:var(--hp-muted)]"
                        dateTime={
                          post.publishedAt ??
                          post.published_at ??
                          post.date
                        }
                      >
                        {dateLabel}
                      </time>
                    ) : null}
                  </div>
                  {excerpt ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[color:var(--hp-muted)]">
                      {excerpt}
                    </p>
                  ) : null}
                </Link>
              </article>
            </li>
          );
        })}
      </ul>

      {!hidePagination && pagination.totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hp-border)] pt-4 text-sm"
          aria-label="ページ送り"
        >
          <div className="text-[color:var(--hp-muted)]">
            {pagination.page} / {pagination.totalPages} ページ
          </div>
          <div className="flex flex-wrap gap-2">
            {currentPage > 1 ? (
              <Link
                href={
                  currentPage === 2
                    ? appPath("/announcements")
                    : `${appPath("/announcements")}?page=${currentPage - 1}`
                }
                className="rounded-md border border-[color:var(--hp-border)] px-3 py-1.5 text-[color:var(--hp-accent)] hover:bg-[color:var(--hp-card)]"
              >
                前へ
              </Link>
            ) : (
              <span className="rounded-md border border-transparent px-3 py-1.5 text-[color:var(--hp-muted)] opacity-50">
                前へ
              </span>
            )}
            {currentPage < pagination.totalPages ? (
              <Link
                href={`${appPath("/announcements")}?page=${currentPage + 1}`}
                className="rounded-md border border-[color:var(--hp-border)] px-3 py-1.5 text-[color:var(--hp-accent)] hover:bg-[color:var(--hp-card)]"
              >
                次へ
              </Link>
            ) : (
              <span className="rounded-md border border-transparent px-3 py-1.5 text-[color:var(--hp-muted)] opacity-50">
                次へ
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
