"use client";

import { HP_DATA_CHANGED } from "@/lib/data-changed";
import { useEffect } from "react";

/** 他端末からの同期・ログイン時マージ後に一覧を再読み込みする */
export function useReloadOnHealthDataSync(reload: () => void | Promise<void>): void {
  useEffect(() => {
    const onChanged = () => {
      void reload();
    };
    window.addEventListener(HP_DATA_CHANGED, onChanged);
    return () => window.removeEventListener(HP_DATA_CHANGED, onChanged);
  }, [reload]);
}
