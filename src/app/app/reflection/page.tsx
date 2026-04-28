import type { Metadata } from "next";
import { ReflectionPageClient } from "./reflection-page-client";

export const metadata: Metadata = {
  title: "振り返り",
};

export default function ReflectionPage() {
  return <ReflectionPageClient />;
}
