import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionalmente y resuelve conflictos de Tailwind
 * (ej: "p-2 p-4" -> "p-4"). Estándar en proyectos shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
