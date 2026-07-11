"use server";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  magicLinkSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface AuthActionState {
  error?: string;
  success?: boolean;
  message?: string;
}

/** Login con email + password. */
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Mensaje amigable: Supabase devuelve "Invalid login credentials" genérico
    // por seguridad (no revela si el email existe o no).
    return { error: "Email o contraseña incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Registro con email + password. Supabase envía email de confirmación. */
export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Ya existe una cuenta con este email. Intenta iniciar sesión." };
    }
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  // Si la confirmación de email está desactivada, Supabase ya devuelve sesión activa.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    success: true,
    message: "¡Cuenta creada! Revisa tu email para confirmar tu cuenta antes de iniciar sesión.",
  };
}

/** Envía un magic link (enlace de acceso sin contraseña) al email. */
export async function magicLinkAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: "No se pudo enviar el enlace. Intenta de nuevo en unos minutos." };
  }

  return {
    success: true,
    message: `Te enviamos un enlace de acceso a ${parsed.data.email}. Revisa tu bandeja de entrada.`,
  };
}

/** Envía email con enlace para restablecer contraseña. */
export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirectTo=/update-password`,
  });

  // Por seguridad, siempre mostramos éxito exista o no el email (no filtrar
  // qué emails están registrados). El error real solo se loguea server-side.
  if (error) console.error("resetPasswordForEmail error:", error.message);

  return {
    success: true,
    message: `Si existe una cuenta con ${parsed.data.email}, te enviamos instrucciones para restablecer tu contraseña.`,
  };
}

/** Actualiza la contraseña del usuario ya autenticado (tras click en el enlace de reset). */
export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: "No se pudo actualizar la contraseña. El enlace puede haber expirado." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Cierra la sesión actual. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
