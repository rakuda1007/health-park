"use client";

import { AnnouncementArticleEmbed } from "./announcement-article-embed";
import { AdsenseDisplayUnit } from "@/components/adsense-display-unit";
import { RecordingPageAd } from "@/components/recording-page-ad";
import {
  getAdsenseAnnouncementLeftSlotId,
  getAdsenseAnnouncementRightSlotId,
  getAdsenseAnnouncementTopSlotId,
} from "@/lib/adsense-config";
import { useMemo } from "react";

type Props = {
  embedSrc: string;
  title: string;
  trustedOrigin: string;
};

/**
 * お知らせ詳細: 中央 max-w-4xl に embed、lg 以上で左右柱、iframe 上に任意の上枠、下は RecordingPageAd。
 */
export function AnnouncementArticleWithAds({
  embedSrc,
  title,
  trustedOrigin,
}: Props) {
  const topSlot = useMemo(() => getAdsenseAnnouncementTopSlotId(), []);
  const leftSlot = useMemo(() => getAdsenseAnnouncementLeftSlotId(), []);
  const rightSlot = useMemo(() => getAdsenseAnnouncementRightSlotId(), []);

  return (
    <div className="mx-auto flex w-full max-w-7xl justify-center gap-6">
      {leftSlot ? (
        <AdsenseDisplayUnit
          slot={leftSlot}
          format="vertical"
          className="sticky top-24 hidden w-[160px] shrink-0 self-start lg:block"
          aria-label="広告（左）"
        />
      ) : null}
      <div className="min-w-0 w-full max-w-4xl shrink-0">
        {topSlot ? (
          <AdsenseDisplayUnit
            slot={topSlot}
            format="auto"
            className="mb-4 w-full min-w-0"
            aria-label="広告（記事上）"
          />
        ) : null}
        <AnnouncementArticleEmbed
          src={embedSrc}
          title={title}
          trustedOrigin={trustedOrigin}
        />
        {/*
          iframe 内は別オリジンのため広告は埋め込めない。
          記録ページと同じロジックのユニットを本文下に表示する。
        */}
        <RecordingPageAd />
      </div>
      {rightSlot ? (
        <AdsenseDisplayUnit
          slot={rightSlot}
          format="vertical"
          className="sticky top-24 hidden w-[160px] shrink-0 self-start lg:block"
          aria-label="広告（右）"
        />
      ) : null}
    </div>
  );
}
