"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePasswordAction, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

const initialState: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" isLoading={pending}>
      Guardar nueva contraseña
    </Button>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="new-password" required />
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
