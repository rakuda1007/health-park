import type { Metadata } from "next";
import { DashboardPageClient } from "./dashboard-page-client";

export const metadata: Metadata = {
  title: "ホーム",
};

export default function DashboardPage() {
  return <DashboardPageClient />;
}
