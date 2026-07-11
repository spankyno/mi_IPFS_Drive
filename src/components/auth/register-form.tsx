"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" isLoading={pending}>
      Crear cuenta
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="size-8 text-primary" />
        <p className="text-sm text-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, una mayúscula y un número.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
