const SITE_URL = "https://mi-ipfs-drive.vercel.app";
const AUTHOR_NAME = "Aitor Sánchez Gutiérrez";
const AUTHOR_BLOG_URL = "https://aitorsanchez.pages.dev";
const AUTHOR_HUB_URL = "https://aitorhub.vercel.app";
const AUTHOR_CONTACT_URL = "https://aitorsanchez.pages.dev/contacto";

/**
 * Datos estructurados (schema.org) para buscadores. No se muestran al
 * usuario — ayudan a Google a entender qué es la app, quién la mantiene,
 * y sus planes de precios, para poder mostrar resultados enriquecidos.
 * Renderizado en el layout raíz, así que aplica a todas las páginas.
 */
export function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "mi_IPFS_Drive",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Almacenamiento de archivos seguro, privado y completamente descentralizado sobre la red IPFS. Sin servidores centrales, sin censura, sin límites.",
        offers: [
          {
            "@type": "Offer",
            name: "Registrado",
            price: "0",
            priceCurrency: "EUR",
            description: "500 MB de almacenamiento, 50 archivos, 25 MB por archivo, 3 enlaces de compartición.",
          },
          {
            "@type": "Offer",
            name: "Pro",
            price: "19",
            priceCurrency: "EUR",
            description: "5 GB de almacenamiento, 5.000 archivos, 500 MB por archivo, 100 enlaces de compartición.",
          },
        ],
        author: { "@id": `${AUTHOR_BLOG_URL}#author` },
        publisher: { "@id": `${AUTHOR_BLOG_URL}#author` },
      },
      {
        "@type": "Person",
        "@id": `${AUTHOR_BLOG_URL}#author`,
        name: AUTHOR_NAME,
        url: AUTHOR_BLOG_URL,
        sameAs: [AUTHOR_HUB_URL],
        contactPoint: {
          "@type": "ContactPoint",
          url: AUTHOR_CONTACT_URL,
          contactType: "customer support",
        },
      },
      {
        "@type": "WebSite",
        url: SITE_URL,
        name: "mi_IPFS_Drive",
        inLanguage: "es",
        author: { "@id": `${AUTHOR_BLOG_URL}#author` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON estático generado por nosotros, no HTML de usuario; es el mecanismo estándar de Next.js para JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
