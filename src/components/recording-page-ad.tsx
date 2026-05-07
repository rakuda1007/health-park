"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  getAdsenseFixedSize,
  getAdsenseUnitIds,
  shouldShowRecordingPageAds,
} from "@/lib/adsense-config";
import { useEffect, useMemo, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

/**
 * 記録フォーム直下（保存ボタン直下）用の AdSense スロット。
 * client/slot・サイズは環境変数（詳細は .env.local.example）。
 */
export function RecordingPageAd() {
  const { user, ready } = useAuth();
  const ids = useMemo(() => getAdsenseUnitIds(), []);
  const { width, height } = useMemo(() => getAdsenseFixedSize(), []);
  const show =
    ids != null && shouldShowRecordingPageAds(user ?? null, ready);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!show || !ids) {
      return;
    }
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled || pushedRef.current) {
        return;
      }
      pushedRef.current = true;
      try {
        window.adsbygoogle = window.adsbygoogle ?? [];
        window.adsbygoogle.push({});
      } catch (e) {
        pushedRef.current = false;
        console.error("[Health Park] AdSense の初期化に失敗しました", e);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [show, ids]);

  if (!show || !ids) {
    return null;
  }

  return (
    <aside
      className="mt-4 flex w-full max-w-full min-w-0 justify-center"
      aria-label="広告"
    >
      <ins
        className="adsbygoogle max-w-full"
        style={{
          display: "inline-block",
          width,
          height,
          maxWidth: "100%",
          boxSizing: "border-box",
          verticalAlign: "bottom",
        }}
        data-ad-client={ids.client}
        data-ad-slot={ids.slot}
        data-full-width-responsive="false"
      />
    </aside>
  );
}
