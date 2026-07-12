import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mi-ipfs-drive.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // El dashboard y las páginas de auth son privadas/sin contenido
        // indexable útil; no tiene sentido que los buscadores las rastreen.
        disallow: ["/dashboard", "/login", "/register", "/forgot-password", "/update-password", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
