"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  getAdsenseFixedSizeForViewport,
  isAdsenseAdtestEnabled,
  getAdsenseMobileSlotId,
  getAdsenseUnitIds,
  shouldShowRecordingPageAds,
} from "@/lib/adsense-config";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

/**
 * 記録フォーム直下（保存ボタン直下）用の AdSense スロット。
 * note-park 互換の固定枠（軽め）:
 * - data-full-width-responsive=\"false\"
 * - 固定 width/height（既定 320×100、任意で 300×250）
 * - スクリプト読み込み後に 1 回 push
 */
export function RecordingPageAd() {
  const { user, ready } = useAuth();
  const ids = useMemo(() => getAdsenseUnitIds(), []);
  const mobileSlot = useMemo(() => getAdsenseMobileSlotId(), []);
  const [isMobile, setIsMobile] = useState(false);
  const adtest = useMemo(() => isAdsenseAdtestEnabled(), []);
  const { width, height } = useMemo(
    () => getAdsenseFixedSizeForViewport(isMobile),
    [isMobile],
  );
  const show =
    ids != null && shouldShowRecordingPageAds(user ?? null, ready);
  const pushedRef = useRef(false);

  const slot = isMobile && mobileSlot ? mobileSlot : (ids?.slot ?? "");

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    pushedRef.current = false;
  }, [slot, width, height]);

  useEffect(() => {
    if (!show || !ids || !slot) {
      return;
    }

    let cancelled = false;

    const doPush = () => {
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
    };

    // スクリプト onLoad イベントを待つ（最大 4 秒フォールバック）。
    const onScriptLoaded = () => doPush();
    window.addEventListener("hp-adsense-loaded", onScriptLoaded as EventListener);
    const t = window.setTimeout(() => doPush(), 4000);

    return () => {
      cancelled = true;
      window.removeEventListener("hp-adsense-loaded", onScriptLoaded as EventListener);
      window.clearTimeout(t);
    };
  }, [show, ids, slot, width, height]);

  if (!show || !ids) {
    return null;
  }

  if (!slot) {
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
        data-ad-slot={slot}
        data-full-width-responsive="false"
        data-adtest={adtest ? "on" : undefined}
      />
    </aside>
  );
}
