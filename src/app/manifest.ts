import { appPath } from "@/lib/app-paths";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Health Park",
    short_name: "Health Park",
    description:
      "体重・歩数・血圧・処方・食事・病院・既往歴を、端末内に記録するシンプルなヘルス記録アプリ",
    start_url: appPath("/dashboard"),
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
    categories: ["health", "lifestyle"],
    icons: [
      {
        src: "/icons/HealthPark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/HealthPark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
