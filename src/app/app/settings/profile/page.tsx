import type { Metadata } from "next";
import { ProfilePageClient } from "./profile-page-client";

export const metadata: Metadata = {
  title: "プロフィール",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
