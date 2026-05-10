"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  getAdsenseFallbackDelayMs,
  getAdsenseFallbackSlotId,
  getAdsenseMobileSlotId,
  getAdsenseUnitIds,
  isAdsenseAdtestEnabled,
  isAdsenseDebugEnabled,
  isAdsenseFallbackEnabled,
  shouldShowRecordingPageAds,
} from "@/lib/adsense-config";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
    __hpAdsenseLoaded?: boolean;
  }
}

/**
 * 記録フォーム直下（保存ボタン直下）用の AdSense スロット。
 * - data-full-width-responsive="true" / data-ad-format="auto" のレスポンシブ枠
 * - スクリプト読み込み後に 1 回 push
 */
export function RecordingPageAd() {
  const { user, ready } = useAuth();
  const ids = useMemo(() => getAdsenseUnitIds(), []);
  const mobileSlot = useMemo(() => getAdsenseMobileSlotId(), []);
  const [isMobile, setIsMobile] = useState(false);
  const adtest = useMemo(() => isAdsenseAdtestEnabled(), []);
  const debugEnabled = useMemo(() => isAdsenseDebugEnabled(), []);
  const fallbackEnabled = useMemo(() => isAdsenseFallbackEnabled(), []);
  const fallbackDelayMs = useMemo(() => getAdsenseFallbackDelayMs(), []);
  const fallbackSlot = useMemo(() => getAdsenseFallbackSlotId(), []);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "ok" | "error">("idle");
  const [adStatus, setAdStatus] = useState<"unknown" | "filled" | "unfilled">(
    "unknown",
  );
  const [variant, setVariant] = useState<"primary" | "fallback">("primary");
  const show =
    ids != null && shouldShowRecordingPageAds(user ?? null, ready);
  const pushedRef = useRef(false);
  const insRef = useRef<HTMLElement | null>(null);

  const primarySlot = isMobile && mobileSlot ? mobileSlot : (ids?.slot ?? "");
  const slot =
    variant === "fallback" && fallbackSlot ? fallbackSlot : primarySlot;

  useEffect(() => {
    if (window.__hpAdsenseLoaded) {
      setScriptLoaded(true);
    }
  }, []);

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
    setPushStatus("idle");
    setAdStatus("unknown");
  }, [slot, variant]);

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
        setPushStatus("ok");
      } catch (e) {
        pushedRef.current = false;
        setPushStatus("error");
        console.error("[Health Park] AdSense の初期化に失敗しました", e);
      }
    };

    // スクリプト onLoad イベントを待つ。取りこぼし対策で loaded フラグをポーリングする。
    const onScriptLoaded = () => {
      window.__hpAdsenseLoaded = true;
      setScriptLoaded(true);
      doPush();
    };
    window.addEventListener("hp-adsense-loaded", onScriptLoaded as EventListener);
    const poll = window.setInterval(() => {
      if (window.__hpAdsenseLoaded) {
        onScriptLoaded();
      }
    }, 500);
    const t = window.setTimeout(() => {
      if (!pushedRef.current) {
        doPush();
      }
    }, 6000);

    return () => {
      cancelled = true;
      window.removeEventListener("hp-adsense-loaded", onScriptLoaded as EventListener);
      window.clearInterval(poll);
      window.clearTimeout(t);
    };
  }, [show, ids, slot, variant]);

  // ins の data-ad-status（filled / unfilled）を監視する。
  useEffect(() => {
    if (!show || !slot) {
      return;
    }
    const poll = window.setInterval(() => {
      const status = insRef.current?.getAttribute("data-ad-status");
      if (status === "filled") {
        setAdStatus("filled");
      } else if (status === "unfilled") {
        setAdStatus("unfilled");
      }
    }, 1000);
    return () => {
      window.clearInterval(poll);
    };
  }, [show, slot, variant]);

  // モバイルで unfilled のとき、一定時間後にフォールバック枠へ切替。
  useEffect(() => {
    if (
      !isMobile ||
      !fallbackEnabled ||
      variant !== "primary" ||
      adStatus !== "unfilled"
    ) {
      return;
    }
    const t = window.setTimeout(() => {
      setVariant("fallback");
    }, fallbackDelayMs);
    return () => {
      window.clearTimeout(t);
    };
  }, [isMobile, fallbackEnabled, variant, adStatus, fallbackDelayMs]);

  if (!show || !ids || !slot) {
    return null;
  }

  // フォールバック切替前のモバイルでは、しばらく ins を残す必要がある
  const waitingMobileFallback =
    fallbackEnabled &&
    isMobile &&
    variant === "primary" &&
    adStatus === "unfilled";

  const adRequestFailed =
    adStatus === "unfilled" || pushStatus === "error";

  const collapseAdArea =
    adRequestFailed && !waitingMobileFallback;

  // 本番: 未配信・push 失敗時は余白ごと非表示。デバッグ時は状態確認のため残す
  if (collapseAdArea && !debugEnabled) {
    return null;
  }

  return (
    <aside
      className="mt-4 w-full max-w-full min-w-0"
      aria-label="広告"
    >
      {!(collapseAdArea && debugEnabled) ? (
        <ins
          key={`${slot}-${variant}`}
          ref={(el) => {
            insRef.current = el;
          }}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ids.client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-adtest={adtest ? "on" : undefined}
        />
      ) : null}
      {debugEnabled ? (
        <div className="mt-2 w-full max-w-[22rem] rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-[11px] leading-5 text-[color:var(--hp-muted)]">
          <div>ads-debug: on</div>
          <div>isMobile: {String(isMobile)}</div>
          <div>slot: {slot || "(empty)"}</div>
          <div>variant: {variant}</div>
          <div>adtest: {adtest ? "on" : "off"}</div>
          <div>scriptLoadedEvent: {scriptLoaded ? "yes" : "no"}</div>
          <div>pushStatus: {pushStatus}</div>
          <div>data-ad-status: {adStatus}</div>
          <div>fallbackEnabled: {fallbackEnabled ? "on" : "off"}</div>
          <div>authReady: {String(ready)}</div>
          <div>showAd: {String(show)}</div>
        </div>
      ) : null}
    </aside>
  );
}
