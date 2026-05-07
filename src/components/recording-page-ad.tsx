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
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
 * ビューポート確定後にのみ slot／レイアウトを確定し push する（初回の誤レイアウト push を避ける）。
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
  const [viewportReady, setViewportReady] = useState(false);
  const show =
    ids != null && shouldShowRecordingPageAds(user ?? null, ready);
  const pushedRef = useRef(false);

  useLayoutEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    setIsMobile(query.matches);
    setViewportReady(true);
    const sync = () => setIsMobile(query.matches);
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  const slot =
    viewportReady && isMobile && mobileSlot ? mobileSlot : (ids?.slot ?? "");

  const effectiveLayout = viewportReady
    ? resolveRecordingPageAdLayout(isMobile, layoutMode)
    : layoutMode;

  useEffect(() => {
    pushedRef.current = false;
  }, [viewportReady, slot, layoutMode, isMobile]);

  useEffect(() => {
    if (!viewportReady || !show || !ids || !slot) {
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
  }, [viewportReady, show, ids, slot, effectiveLayout]);

  if (!show || !ids) {
    return null;
  }

  if (!viewportReady) {
    return (
      <aside
        className="mt-4 flex min-h-[100px] w-full max-w-full min-w-0 justify-center"
        aria-label="広告"
        aria-busy="true"
      />
    );
  }

  if (!slot) {
    return null;
  }

  const insKey = `${slot}-${effectiveLayout}-${adtest ? "t" : "p"}`;

  return (
    <aside
      className="mt-4 flex w-full max-w-full min-w-0 justify-center"
      aria-label="広告"
    >
      {effectiveLayout === "responsive" ? (
        <ins
          key={insKey}
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
          key={insKey}
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
