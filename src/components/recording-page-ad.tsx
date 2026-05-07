"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  getAdsenseMobileSlotId,
  getAdsenseFixedSize,
  getAdsenseLayoutMode,
  getAdsenseResponsiveMinHeightPx,
  getAdsenseUnitIds,
  isAdsenseAdtestEnabled,
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
 * client/slot・サイズは環境変数（詳細は .env.local.example）。
 */
export function RecordingPageAd() {
  const { user, ready } = useAuth();
  const ids = useMemo(() => getAdsenseUnitIds(), []);
  const mobileSlot = useMemo(() => getAdsenseMobileSlotId(), []);
  const layoutMode = useMemo(() => getAdsenseLayoutMode(), []);
  const { width, height } = useMemo(() => getAdsenseFixedSize(), []);
  const responsiveMinH = useMemo(
    () => getAdsenseResponsiveMinHeightPx(),
    [],
  );
  const adtest = useMemo(() => isAdsenseAdtestEnabled(), []);
  const [isMobile, setIsMobile] = useState(false);
  const show =
    ids != null && shouldShowRecordingPageAds(user ?? null, ready);
  const pushedRef = useRef(false);
  const slot = isMobile && mobileSlot ? mobileSlot : ids?.slot ?? "";

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
  }, [slot, layoutMode]);

  useEffect(() => {
    if (!show || !ids || !slot) {
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
  }, [show, ids, slot, layoutMode]);

  if (!show || !ids || !slot) {
    return null;
  }

  return (
    <aside
      className="mt-4 flex w-full max-w-full min-w-0 justify-center"
      aria-label="広告"
    >
      {layoutMode === "responsive" ? (
        <ins
          className="adsbygoogle w-full max-w-full"
          style={{
            display: "block",
            minHeight: responsiveMinH,
          }}
          data-ad-client={ids.client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-adtest={adtest ? "on" : undefined}
        />
      ) : (
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
      )}
    </aside>
  );
}
