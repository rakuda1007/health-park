"use client";

import {
  HEALTH_PARK_BLOG_EMBED_HEIGHT_MESSAGE_TYPE,
  HEALTH_PARK_BLOG_EMBED_REQUEST_HEIGHT_MESSAGE_TYPE,
} from "@/lib/health-blog";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  title: string;
  /** NEXT_PUBLIC_HEALTH_BLOG_ORIGIN から解決したオリジン（postMessage の発信元検証） */
  trustedOrigin: string;
};

/** 子ドキュメントの計測誤差・スクロールバー幅ぶんを足して内側スクロールを抑える */
const HEIGHT_BUFFER_PX = 80;

/**
 * postMessage で高さが取れない間の最小高さ。数値のみ（px）。未設定時は長文でも内側スクロールが出にくい大きめの値。
 * @see NEXT_PUBLIC_ANNOUNCEMENT_EMBED_FALLBACK_MIN_PX in .env.local.example
 */
function fallbackMinHeightCss(): string {
  const raw = process.env.NEXT_PUBLIC_ANNOUNCEMENT_EMBED_FALLBACK_MIN_PX?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const px = Math.min(Math.max(Number(raw), 200), 50_000);
    return `min(96vh, ${px}px)`;
  }
  return "min(96vh, 9600px)";
}

/**
 * クロスオリジン iframe 内のスクロールバーは親の CSS では消せない。
 * ブログ embed が `HEALTH_PARK_BLOG_EMBED_HEIGHT_MESSAGE_TYPE` で高さを送ると iframe の height を合わせる。
 * 親は `HEALTH_PARK_BLOG_EMBED_REQUEST_HEIGHT_MESSAGE_TYPE` で再計測を依頼する（ブログ側の対応が必要）。
 */
export function AnnouncementArticleEmbed({ src, title, trustedOrigin }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [contentHeightPx, setContentHeightPx] = useState<number | null>(null);

  useEffect(() => {
    setContentHeightPx(null);
  }, [src, trustedOrigin]);

  const requestHeightFromChild = useCallback(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w) {
      return;
    }
    try {
      w.postMessage(
        { type: HEALTH_PARK_BLOG_EMBED_REQUEST_HEIGHT_MESSAGE_TYPE },
        trustedOrigin,
      );
    } catch {
      /* 無効な targetOrigin 等 */
    }
  }, [trustedOrigin]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== trustedOrigin) {
        return;
      }
      if (e.source !== iframeRef.current?.contentWindow) {
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
      const capped = Math.min(
        Math.max(Math.ceil(rec.height + HEIGHT_BUFFER_PX), 1),
        200_000,
      );
      setContentHeightPx(capped);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [trustedOrigin]);

  useEffect(() => {
    const ids = [500, 1800, 4000].map((ms) =>
      window.setTimeout(requestHeightFromChild, ms),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [src, requestHeightFromChild]);

  const handleIframeLoad = () => {
    requestHeightFromChild();
  };

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      className="mt-6 w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]"
      style={
        contentHeightPx != null
          ? { height: contentHeightPx, minHeight: 0 }
          : { minHeight: fallbackMinHeightCss() }
      }
      loading="lazy"
      onLoad={handleIframeLoad}
    />
  );
}
