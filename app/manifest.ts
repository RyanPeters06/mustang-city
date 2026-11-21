import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mustang City",
    short_name: "Mustang City",
    description: "Graduate knowing your city.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#140A2E",
    theme_color: "#140A2E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
