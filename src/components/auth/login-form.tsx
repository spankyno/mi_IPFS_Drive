"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, magicLinkAction, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, KeyRound, Mail, AlertCircle } from "lucide-react";

const initialState: AuthActionState = {};

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" isLoading={pending}>
      {children}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  return (
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="password" className="gap-1.5">
          <KeyRound className="size-3.5" /> Contraseña
        </TabsTrigger>
        <TabsTrigger value="magic-link" className="gap-1.5">
          <Mail className="size-3.5" /> Magic link
        </TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <PasswordLoginForm redirectTo={redirectTo} />
      </TabsContent>

      <TabsContent value="magic-link">
        <MagicLinkLoginForm />
      </TabsContent>
    </Tabs>
  );
}

function PasswordLoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" required />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </p>
      )}

      <SubmitButton>Iniciar sesión</SubmitButton>
    </form>
  );
}

function MagicLinkLoginForm() {
  const [state, formAction] = useActionState(magicLinkAction, initialState);

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
        <Label htmlFor="magic-email">Email</Label>
        <Input id="magic-email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" required />
        <p className="text-xs text-muted-foreground">
          Te enviamos un enlace de un solo uso. Sin contraseñas.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </p>
      )}

      <SubmitButton>Enviar enlace de acceso</SubmitButton>
    </form>
  );
}
