import type { Metadata } from "next";
import { SettingsPageClient } from "./settings-page-client";

export const metadata: Metadata = {
  title: "設定",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
