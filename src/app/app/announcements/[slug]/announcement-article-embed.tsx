export function AnnouncementArticleEmbed({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  return (
    <iframe
      src={src}
      title={title}
      className="min-h-[min(80vh,800px)] w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]"
      loading="lazy"
    />
  );
}
