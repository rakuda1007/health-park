/**
 * ブログ CMS が API で返す HTML を表示する（同一オリジン iframe の embed ページが 404 でも閲覧可能にする）。
 * サーバーコンポーネントで描画し、初期 HTML に本文を含める（SEO 向け）。
 */
export function AnnouncementArticleBody({ html }: { html: string }) {
  return (
    <article
      className="mt-6 max-w-none text-sm leading-relaxed text-[color:var(--hp-foreground)] [&_a]:break-words [&_a]:text-[color:var(--hp-accent)] [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[color:var(--hp-border)] [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-black/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_pre]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-[color:var(--hp-border)] [&_pre]:bg-[color:var(--hp-card)] [&_pre]:p-3 [&_pre]:text-xs [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
