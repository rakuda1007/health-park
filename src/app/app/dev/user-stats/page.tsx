import type { Metadata } from "next";
import { UserStatsPageClient } from "./user-stats-page-client";

export const metadata: Metadata = {
  title: "利用統計（開発者）",
};

export default function UserStatsPage() {
  return <UserStatsPageClient />;
}
