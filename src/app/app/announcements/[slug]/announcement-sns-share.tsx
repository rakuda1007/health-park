"use client";

import { useEffect, useState } from "react";

type Props = {
  /** 本番の案内 URL（例: https://health.../app/announcements/slug）。未設定時はクライアントで location を補完 */
  shareUrl: string | null;
  title: string;
};

function buildTwitterIntentUrl(url: string, text: string): string {
  const p = new URL("https://twitter.com/intent/tweet");
  p.searchParams.set("url", url);
  if (text.trim()) {
    p.searchParams.set("text", text.trim());
  }
  return p.toString();
}

function buildFacebookSharerUrl(url: string): string {
  const p = new URL("https://www.facebook.com/sharer/sharer.php");
  p.searchParams.set("u", url);
  return p.toString();
}

/**
 * Health Park 側のお知らせ URL を X / Facebook に渡す共有リンク。
 * iframe 内のブログのシェアとは別（常にこのアプリの公開 URL）。
 */
export function AnnouncementSnsShare({ shareUrl, title }: Props) {
  const [effectiveUrl, setEffectiveUrl] = useState<string | null>(shareUrl);

  useEffect(() => {
    if (shareUrl) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    setEffectiveUrl(window.location.href);
  }, [shareUrl]);

  if (!effectiveUrl) {
    return null;
  }

  const xHref = buildTwitterIntentUrl(effectiveUrl, title);
  const fbHref = buildFacebookSharerUrl(effectiveUrl);

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--hp-border)] pt-4"
      role="region"
      aria-label="この記事を共有"
    >
      <span className="text-sm font-medium text-[color:var(--hp-muted)]">
        この記事を共有
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-input)]"
        >
          X（旧 Twitter）で共有
        </a>
        <a
          href={fbHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--hp-foreground)] hover:bg-[color:var(--hp-input)]"
        >
          Facebook で共有
        </a>
      </div>
    </div>
  );
}
