import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPinningAdapter } from "@/lib/ipfs/pinning-provider";
import { getMyLimits } from "@/lib/supabase/queries";
import { formatBytes } from "@/lib/utils/format";
import { z } from "zod";

const bodySchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive().max(5 * 1024 * 1024 * 1024), // 5 GB, tope absoluto de la app (por encima del de cualquier plan)
});

/**
 * Emite una URL firmada (PUT) de corta duración para que el navegador suba
 * el archivo DIRECTAMENTE al pinning service, sin pasar por nuestro
 * servidor (evita cuellos de botella y límites de body size de Vercel).
 *
 * El archivo no se guarda en ningún sitio nuestro; solo generamos la key
 * y la URL firmada. La confirmación final (leer el CID y guardar
 * metadatos) ocurre en `finalizeUploadAction` una vez el PUT ha terminado.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de subida inválidos.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Comprobamos los 3 límites del plan del usuario ANTES de emitir la URL
  // firmada. Sin esto, cualquiera podía seguir subiendo sin ningún límite
  // real de la aplicación (el único límite habría sido el del propio
  // Filebase, no el nuestro) — ver migración 0005 y tabla `plans`.
  const limits = await getMyLimits(supabase);

  if (parsed.data.sizeBytes > limits.maxFileSizeBytes) {
    return NextResponse.json(
      {
        error: `Tu plan (${limits.planDisplayName}) permite archivos de hasta ${formatBytes(limits.maxFileSizeBytes)}. Este archivo pesa ${formatBytes(parsed.data.sizeBytes)}.`,
      },
      { status: 413 }
    );
  }

  if (limits.usedBytes + parsed.data.sizeBytes > limits.storageQuotaBytes) {
    return NextResponse.json(
      {
        error: `Este archivo superaría tu cuota de almacenamiento (${formatBytes(limits.storageQuotaBytes)} en el plan ${limits.planDisplayName}). Borra algo o mejora de plan.`,
      },
      { status: 413 }
    );
  }

  if (limits.fileCount >= limits.maxFiles) {
    return NextResponse.json(
      {
        error: `Has alcanzado el límite de ${limits.maxFiles} archivos de tu plan (${limits.planDisplayName}). Borra alguno o mejora de plan.`,
      },
      { status: 413 }
    );
  }

  // Namespacing por usuario: evita colisiones entre usuarios y facilita
  // auditar/borrar todo lo de un usuario en el bucket si hace falta.
  const safeName = parsed.data.fileName.replace(/[^\w.\-]/g, "_");
  const key = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  try {
    const adapter = getPinningAdapter();
    const uploadUrl = await adapter.getUploadUrl(key, parsed.data.contentType);
    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Error generando URL de subida:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo generar la URL de subida." },
      { status: 500 }
    );
  }
}
