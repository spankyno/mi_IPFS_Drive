import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { QueryProvider } from "@/components/shared/query-provider";
import { Toaster } from "sonner";
import { JsonLd } from "@/components/shared/json-ld";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mi-ipfs-drive.vercel.app";
const TITLE =
  "mi_IPFS_Drive — Almacenamiento de Archivos Descentralizado en IPFS | Privado y Seguro";
const DESCRIPTION =
  "Almacenamiento de archivos seguro, privado y completamente descentralizado sobre la red IPFS. Sin servidores centrales, sin censura, sin límites. Tu información, bajo tu control.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | mi_IPFS_Drive",
  },
  description: DESCRIPTION,
  keywords: [
    "IPFS",
    "almacenamiento descentralizado",
    "drive descentralizado",
    "almacenamiento de archivos privado",
    "cifrado de archivos AES-256",
    "Web3 storage",
    "almacenamiento sin censura",
    "compartir archivos IPFS",
    "alternativa a Google Drive descentralizada",
  ],
  authors: [{ name: "Aitor Sánchez Gutiérrez", url: "https://aitorsanchez.pages.dev" }],
  creator: "Aitor Sánchez Gutiérrez",
  publisher: "Aitor Sánchez Gutiérrez",
  verification: {
    google: "MEiDmnJOvnWITHUi0HCLxuoulOEm0oTM4fwQMugxoyY",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: "mi_IPFS_Drive",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "mi_IPFS_Drive" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <JsonLd />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" closeButton />
          </QueryProvider>
        </ThemeProvider>

        {/* Script de Aitor's Analytics */}
        <Script
          src="https://aitors-hub-dashboard.asanchezgu.workers.dev/tracker.js"
          data-app="ipfs-drive"
          data-key="ak_617bd780639a4e81b6900417f93a86fa"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
