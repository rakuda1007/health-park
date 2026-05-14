"use client";

import {
  HEALTH_PARK_BLOG_EMBED_HEIGHT_MESSAGE_TYPE,
} from "@/lib/health-blog";
import { useEffect, useState } from "react";

type Props = {
  src: string;
  title: string;
  /** NEXT_PUBLIC_HEALTH_BLOG_ORIGIN から解決したオリジン（postMessage の発信元検証） */
  trustedOrigin: string;
};

/**
 * クロスオリジン iframe 内のスクロールバーは親から消せない。
 * ブログ embed が `HEALTH_PARK_BLOG_EMBED_HEIGHT_MESSAGE_TYPE` で document 高さを送ると、
 * iframe の高さを合わせて内側スクロールをなくす（未対応時は min-height のまま）。
 */
export function AnnouncementArticleEmbed({ src, title, trustedOrigin }: Props) {
  const [contentHeightPx, setContentHeightPx] = useState<number | null>(null);

  useEffect(() => {
    setContentHeightPx(null);
  }, [src, trustedOrigin]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== trustedOrigin) {
        return;
      }
      const payload = e.data;
      if (!payload || typeof payload !== "object") {
        return;
      }
      const rec = payload as { type?: unknown; height?: unknown };
      if (rec.type !== HEALTH_PARK_BLOG_EMBED_HEIGHT_MESSAGE_TYPE) {
        return;
      }
      if (typeof rec.height !== "number" || !Number.isFinite(rec.height)) {
        return;
      }
      const capped = Math.min(Math.max(Math.ceil(rec.height + 16), 1), 200_000);
      setContentHeightPx(capped);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [trustedOrigin]);

  return (
    <iframe
      src={src}
      title={title}
      className="mt-6 w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]"
      style={
        contentHeightPx != null
          ? { height: contentHeightPx, minHeight: 0 }
          : { minHeight: "min(80vh, 800px)" }
      }
      loading="lazy"
    />
  );
}
