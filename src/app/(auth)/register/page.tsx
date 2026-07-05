import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">Empieza a guardar tus archivos en IPFS gratis</p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
