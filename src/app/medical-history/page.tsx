import type { Metadata } from "next";
import { MedicalHistoryPageClient } from "./medical-history-page-client";

export const metadata: Metadata = {
  title: "既往歴",
};

export default function MedicalHistoryPage() {
  return <MedicalHistoryPageClient />;
}
