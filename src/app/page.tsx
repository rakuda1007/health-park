import { redirect } from "next/navigation";
import { appPath } from "@/lib/app-paths";

/** 記録利用者はトップからいきなりホーム（ダッシュボード）へ。案内は `/portal`。 */
export default function RootPage() {
  redirect(appPath("/dashboard"));
}
