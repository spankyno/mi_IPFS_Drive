import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils/format";
import type { PublicPlan } from "@/lib/supabase/queries";
import {
  Network,
  ShieldCheck,
  Share2,
  FolderTree,
  Search,
  Activity,
  Lock,
  Sparkles,
  Check,
  Code2,
} from "lucide-react";

const FEATURES = [
  { icon: FolderTree, title: "Carpetas y organización", text: "Jerarquía real de carpetas, arrastra y suelta para subir múltiples archivos a la vez." },
  { icon: Search, title: "Búsqueda avanzada", text: "Busca por nombre en todo tu drive y filtra por tags personalizadas." },
  { icon: Share2, title: "Compartir con control", text: "Enlaces públicos por CID, o privados con permisos y caducidad, revocables cuando quieras." },
  { icon: Lock, title: "Cifrado cliente-side", text: "AES-256-GCM en tu navegador antes de subir — el contenido en IPFS es ilegible sin tu clave." },
  { icon: Activity, title: "Actividad en tiempo real", text: "Feed de subidas, borrados y comparticiones actualizado al instante en el dashboard." },
  { icon: ShieldCheck, title: "Tu cuenta, tus datos", text: "Autenticación con email/contraseña o magic link; solo tú controlas tu drive." },
];

const TECH_STACK = [
  { name: "Next.js 15", detail: "App Router, Server Components, Server Actions" },
  { name: "React 19", detail: "Interfaz reactiva y moderna" },
  { name: "TypeScript", detail: "Tipado estricto de extremo a extremo" },
  { name: "Tailwind CSS", detail: "Diseño responsive y accesible" },
  { name: "Supabase", detail: "Auth, Postgres, Realtime y Row Level Security" },
  { name: "IPFS (Filebase)", detail: "Persistencia descentralizada de archivos" },
  { name: "Web Crypto API", detail: "Cifrado AES-256-GCM en el navegador" },
  { name: "Vercel", detail: "Hosting con despliegue continuo" },
];

/**
 * Contenido "Acerca de" completo: qué es IPFS, características, planes
 * (con datos reales de la tabla `plans`) y stack tecnológico. Se usa
 * tanto en la página pública /acerca-de (sin sesión, enlazada desde el
 * footer) como embebido en /dashboard/settings (con sesión) — una sola
 * fuente de verdad para no mantener dos versiones del mismo contenido.
 */
export function AboutSections({ plans }: { plans: PublicPlan[] }) {
  return (
    <div className="space-y-12">
      {/* Qué es IPFS */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Network className="size-5 text-primary" />
              ¿Qué es IPFS?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>
              IPFS (<em>InterPlanetary File System</em>) es un protocolo de almacenamiento distribuido: en vez de
              guardar un archivo en un único servidor con una URL fija, cada archivo se identifica por un{" "}
              <strong className="text-foreground">CID</strong> (Content Identifier) derivado de su propio
              contenido, y puede servirse desde múltiples nodos de la red.
            </p>
            <p>
              Esto elimina el punto único de fallo típico del almacenamiento centralizado: si un servidor cae, tu
              archivo sigue siendo accesible desde cualquier otro nodo que lo tenga "pineado" (persistido). En
              mi_IPFS_Drive usamos un servicio de pinning gratuito para garantizar que tus archivos permanezcan
              disponibles.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Características */}
      <section>
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">Características</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Planes */}
      <section>
        <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight">Planes</h2>
        <p className="mb-6 text-center text-muted-foreground">Empieza gratis. Mejora cuando lo necesites.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <Card key={plan.id} className={isPro ? "border-amber-400/50 shadow-md" : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isPro && <Sparkles className="size-4 text-amber-500" />}
                    {plan.displayName}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-semibold text-foreground">
                      {plan.priceCentsPerYear === 0 ? "Gratis" : `${(plan.priceCentsPerYear / 100).toFixed(0)}€`}
                    </span>
                    {plan.priceCentsPerYear > 0 && <span className="text-sm"> /año</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <PlanFeature text={`${formatBytes(plan.storageQuotaBytes)} de almacenamiento`} />
                    <PlanFeature text={`${plan.maxFiles.toLocaleString("es-ES")} archivos`} />
                    <PlanFeature text={`${formatBytes(plan.maxFileSizeBytes)} máx. por archivo`} />
                    <PlanFeature text={`${plan.maxActiveShares} enlaces de compartición activos`} />
                    <PlanFeature text="Cifrado cliente-side AES-256" />
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stack tecnológico */}
      <section>
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight">Stack tecnológico</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TECH_STACK.map(({ name, detail }) => (
            <div key={name} className="flex items-start gap-3 rounded-lg border p-4">
              <Code2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-4 shrink-0 text-primary" />
      {text}
    </li>
  );
}
