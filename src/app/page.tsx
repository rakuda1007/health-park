import type { Metadata } from "next";
import { DashboardPageClient } from "./dashboard/dashboard-page-client";

export const metadata: Metadata = {
  title: "ホーム",
};

export default function Home() {
  return <DashboardPageClient />;
}
