"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  getAdsenseFixedSize,
  getAdsenseLayoutMode,
  getAdsenseMobileSlotId,
  getAdsenseResponsiveMinHeightPx,
  getAdsenseUnitIds,
  isAdsenseAdtestEnabled,
  resolveRecordingPageAdLayout,
  shouldShowRecordingPageAds,
} from "@/lib/adsense-config";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const ADSENSE_SCRIPT_ATTR = "data-hp-adsense-loaded";

function isAdsenseScriptMarkedLoaded(): boolean {
  return Boolean(
    document.querySelector(
      `script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"][${ADSENSE_SCRIPT_ATTR}="1"]`,
    ),
  );
}

/**
 * 記録フォーム直下（保存ボタン直下）用の AdSense スロット。
 * PC は NEXT_PUBLIC_ADSENSE_LAYOUT に従う（responsive で大きめ表示しやすい）。
 * モバイルは既定で fixed（全体が responsive のときも PC のみ responsive）。
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

  const effectiveLayout = resolveRecordingPageAdLayout(isMobile, layoutMode);

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
  }, [slot, layoutMode, isMobile]);

  useEffect(() => {
    if (!show || !ids || !slot) {
      return;
    }

    let cancelled = false;

    const tryPush = () => {
      if (cancelled || pushedRef.current) {
        return;
      }
      pushedRef.current = true;
      requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        try {
          window.adsbygoogle = window.adsbygoogle ?? [];
          window.adsbygoogle.push({});
        } catch (e) {
          pushedRef.current = false;
          console.error("[Health Park] AdSense の初期化に失敗しました", e);
        }
      });
    };

    const onScriptLoaded = () => {
      if (!cancelled) {
        tryPush();
      }
    };

    if (isAdsenseScriptMarkedLoaded()) {
      onScriptLoaded();
      return () => {
        cancelled = true;
      };
    }

    window.addEventListener(
      "hp-adsense-loaded",
      onScriptLoaded as EventListener,
    );

    const fallbackMs = 4000;
    const t = window.setTimeout(() => {
      if (!cancelled && !pushedRef.current) {
        tryPush();
      }
    }, fallbackMs);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "hp-adsense-loaded",
        onScriptLoaded as EventListener,
      );
      window.clearTimeout(t);
    };
  }, [show, ids, slot, effectiveLayout]);

  if (!show || !ids || !slot) {
    return null;
  }

  return (
    <aside
      className="mt-4 flex w-full max-w-full min-w-0 justify-center"
      aria-label="広告"
    >
      {effectiveLayout === "responsive" ? (
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
