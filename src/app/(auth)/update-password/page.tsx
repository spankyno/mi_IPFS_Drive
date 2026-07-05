import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">Elige una contraseña segura para tu cuenta.</p>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
