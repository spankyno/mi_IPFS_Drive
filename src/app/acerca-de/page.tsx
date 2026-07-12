import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPublicPlans } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/shared/footer";
import { AboutSections } from "@/components/shared/about-sections";
import { HardDrive, Globe2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Acerca de — Qué es mi_IPFS_Drive y cómo funciona el almacenamiento en IPFS",
  description:
    "Descubre cómo mi_IPFS_Drive almacena tus archivos de forma descentralizada sobre la red IPFS: características, planes de precios y stack tecnológico.",
  alternates: { canonical: "/acerca-de" },
};

export default async function AboutPage() {
  const supabase = await createClient();
  const [{ data: userData }, plans] = await Promise.all([supabase.auth.getUser(), getPublicPlans(supabase)]);
  const user = userData.user;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b p-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <HardDrive className="size-5 text-primary" />
          mi_IPFS_Drive
        </Link>
        <Button variant="ghost" asChild>
          <Link href={user ? "/dashboard" : "/login"}>{user ? "Ir al dashboard" : "Iniciar sesión"}</Link>
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            Almacenamiento de archivos que no depende de nadie
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            mi_IPFS_Drive es un drive personal construido sobre IPFS: tus archivos se cifran y distribuyen en una
            red descentralizada, en vez de vivir en el servidor de una sola empresa.
          </p>
        </section>

        <div className="mx-auto max-w-5xl px-4 pb-16">
          <AboutSections plans={plans} />
        </div>

        <section className="mx-auto max-w-2xl px-4 pb-20 text-center">
          <div className="rounded-xl border bg-muted/30 p-8">
            <Globe2 className="mx-auto mb-3 size-8 text-primary" />
            <h2 className="text-xl font-semibold">¿Listo para probarlo?</h2>
            <p className="mt-1 text-muted-foreground">Crea tu cuenta gratis en menos de un minuto.</p>
            <Button size="lg" className="mt-4" asChild>
              <Link href="/register">Empieza gratis</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
