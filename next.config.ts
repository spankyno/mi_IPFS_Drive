import type { NextConfig } from "next";

/**
 * Configuración de Next.js 15.
 *
 * remotePatterns: permitimos los gateways públicos de IPFS que usaremos
 * para previsualizar imágenes (CID -> URL http). Si cambias de pinning
 * service, añade aquí su gateway dedicado (más rápido y sin rate limit
 * compartido). Ver README.md -> sección "Pinning services".
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ipfs.io", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "ipfs.filebase.io", pathname: "/ipfs/**" }, // gateway público de Filebase, peereado directo con sus nodos
      { protocol: "https", hostname: "*.ipfs.w3s.link", pathname: "/**" }, // web3.storage / Filebase gateway
      { protocol: "https", hostname: "gateway.pinata.cloud", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "*.4everland.io", pathname: "/**" },
      { protocol: "https", hostname: "gateway.lighthouse.storage", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "cloudflare-ipfs.com", pathname: "/ipfs/**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb", // los archivos NO pasan por el server action, solo metadatos
    },
  },
};

export default nextConfig;
