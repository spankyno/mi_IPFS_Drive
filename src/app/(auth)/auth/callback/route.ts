import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase redirige aquí tras un click en magic link o email de confirmación,
 * con un `code` de intercambio (flujo PKCE). Lo canjeamos por una sesión.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Código inválido/expirado: de vuelta al login con un mensaje claro.
  return NextResponse.redirect(
    `${origin}/login?error=El enlace no es válido o ha expirado. Solicita uno nuevo.`
  );
}
