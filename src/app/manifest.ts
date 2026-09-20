import type { MetadataRoute } from "next";

/**
 * Web-маніфест: без нього встановлений через Chrome застосунок бере лише
 * фавікон і вигадує назву з <title>. Із ним ярлик на панелі завдань дістає
 * іконку 512, людське ім'я і темний фон замість білого спалаху на старті.
 *
 * Next віддає це як /manifest.webmanifest і сам додає <link> у <head>.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IS Fleet",
    short_name: "IS Fleet",
    description: "Від хаосу — до контролю",
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // maskable окремим записом: Android малює свою маску поверх, і для неї
      // потрібна версія з полями, інакше зріже краї монограми.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
