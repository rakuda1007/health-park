import { AnnouncementArticlePageClient } from "@/app/app/announcements/[slug]/announcement-article-page-client";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "記事",
};

export default async function AnnouncementArticlePage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  return <AnnouncementArticlePageClient slug={slug} />;
}
