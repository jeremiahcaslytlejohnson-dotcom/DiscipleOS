import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DiscipleOS",
    short_name: "DiscipleOS",
    description: "A system for your daily walk with God.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090f",
    theme_color: "#09090f",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}