"use client";

import {
  HEALTH_PARK_BLOG_EMBED_HEIGHT_MESSAGE_TYPE,
  HEALTH_PARK_BLOG_EMBED_REQUEST_HEIGHT_MESSAGE_TYPE,
  TPC_BLOG_EMBED_HEIGHT_MESSAGE_TYPE,
} from "@/lib/health-blog";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  title: string;
  /** NEXT_PUBLIC_HEALTH_BLOG_ORIGIN から解決したオリジン（postMessage の発信元検証） */
  trustedOrigin: string;
};

/** 子ドキュメントの計測誤差・画像遅延・CTA はみ出し分を足して内側スクロールを抑える */
const HEIGHT_BUFFER_PX = 240;

function parseHeightFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const rec = payload as { type?: unknown; height?: unknown };
  if (
    rec.type !== HEALTH_PARK_BLOG_EMBED_HEIGHT_MESSAGE_TYPE &&
    rec.type !== TPC_BLOG_EMBED_HEIGHT_MESSAGE_TYPE
  ) {
    return null;
  }
  const h = rec.height;
  if (typeof h === "number" && Number.isFinite(h)) {
    return h;
  }
  if (typeof h === "string") {
    const n = Number.parseFloat(h.trim());
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

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
  return "min(96vh, 14000px)";
}

/**
 * クロスオリジン iframe 内のスクロールバーは親の CSS では消せない。
 * ブログ embed が `health-park-embed-height` または `tpc-blog-embed-height` で高さを送ると
 * iframe の height を合わせる。iframe に overflow:hidden を付けると子ドキュメントの
 * CTA 等が欠けて見えることがあるため付与しない。
 * 発信元は `e.origin === trustedOrigin` のみ検証（e.source は環境差で不一致になる例があるため使わない）。
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
      const raw =
        typeof e.data === "string"
          ? (() => {
              try {
                return JSON.parse(e.data) as unknown;
              } catch {
                return null;
              }
            })()
          : e.data;
      const height = parseHeightFromPayload(raw);
      if (height == null) {
        return;
      }
      const capped = Math.min(
        Math.max(Math.ceil(height + HEIGHT_BUFFER_PX), 1),
        200_000,
      );
      setContentHeightPx((prev) =>
        prev == null || capped > prev ? capped : prev,
      );
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [trustedOrigin]);

  useEffect(() => {
    const delays = [0, 120, 400, 900, 2000, 4500, 8000];
    const ids = delays.map((ms) =>
      window.setTimeout(requestHeightFromChild, ms),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [src, requestHeightFromChild]);

  const handleIframeLoad = () => {
    requestHeightFromChild();
  };

  const iframeStyle: CSSProperties =
    contentHeightPx != null
      ? {
          height: contentHeightPx,
          minHeight: 0,
          maxHeight: "none",
        }
      : { minHeight: fallbackMinHeightCss() };

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      className="min-w-0 w-full rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-card)]"
      style={iframeStyle}
      onLoad={handleIframeLoad}
    />
  );
}
