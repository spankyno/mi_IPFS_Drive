import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { AlertCircle } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">Accede a tu drive descentralizado</p>
      </div>

      {params.error && (
        <p role="alert" className="flex items-center gap-1.5 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {params.error}
        </p>
      )}

      <LoginForm redirectTo={params.redirectTo} />

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Crea una gratis
        </Link>
      </p>
    </div>
  );
}
