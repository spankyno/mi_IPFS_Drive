"use server";

import { createClient } from "@/lib/supabase/server";
import { getPinningAdapter } from "@/lib/ipfs/pinning-provider";
import {
  createFolderSchema,
  finalizeUploadSchema,
  renameFileSchema,
  moveFileSchema,
  deleteFileSchema,
} from "@/lib/validations/files";
import { revalidatePath } from "next/cache";

export interface FileActionState {
  error?: string;
  success?: boolean;
}

/**
 * Se llama tras que el navegador haya subido el archivo directamente al
 * pinning service vía la URL firmada. Aquí: (1) leemos el CID recién
 * asignado, (2) guardamos los metadatos en Postgres, (3) registramos la
 * actividad para el feed en tiempo real del dashboard.
 */
export async function finalizeUploadAction(input: unknown) {
  const parsed = finalizeUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos de subida inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const provider = process.env.IPFS_PINNING_PROVIDER || "filebase";
  const adapter = getPinningAdapter();

  let cid: string;
  try {
    cid = await adapter.getCid(parsed.data.key);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el CID del archivo subido.",
    };
  }

  const { data: file, error } = await supabase
    .from("files")
    .insert({
      owner_id: user.id,
      folder_id: parsed.data.folderId,
      name: parsed.data.name,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.sizeBytes,
      cid,
      storage_key: parsed.data.key,
      pinning_provider: provider,
      tags: parsed.data.tags,
    })
    .select("id")
    .single();

  if (error || !file) {
    return { error: "El archivo se subió a IPFS pero no se pudo guardar en tu drive. Intenta de nuevo." };
  }

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "upload",
    file_id: file.id,
    metadata: { fileName: parsed.data.name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/files");

  return { success: true, fileId: file.id, cid };
}

export async function createFolderAction(
  _prevState: FileActionState,
  formData: FormData
): Promise<FileActionState> {
  const parsed = createFolderSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nombre de carpeta inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: folder, error } = await supabase
    .from("folders")
    .insert({ owner_id: user.id, name: parsed.data.name, parent_id: parsed.data.parentId })
    .select("id")
    .single();

  if (error || !folder) {
    return { error: "No se pudo crear la carpeta. Intenta de nuevo." };
  }

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "folder_create",
    folder_id: folder.id,
    metadata: { folderName: parsed.data.name },
  });

  revalidatePath("/dashboard/files");
  return { success: true };
}

export async function deleteFileAction(input: unknown) {
  const parsed = deleteFileSchema.safeParse(input);
  if (!parsed.success) return { error: "Solicitud de borrado inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // RLS ya garantiza que solo puede leer/borrar sus propios archivos, pero
  // necesitamos el storage_key ANTES de borrar la fila para poder borrar
  // también el objeto en el pinning service.
  const { data: file, error: fetchError } = await supabase
    .from("files")
    .select("id, name, storage_key")
    .eq("id", parsed.data.fileId)
    .single();

  if (fetchError || !file) {
    return { error: "Archivo no encontrado." };
  }

  try {
    await getPinningAdapter().deleteObject(file.storage_key);
  } catch (error) {
    // No bloqueamos el borrado del registro por un fallo al despinear —
    // preferimos que desaparezca de la UI aunque quede huérfano en el
    // proveedor, a dejar al usuario con un archivo fantasma que no puede borrar.
    console.error("Error borrando objeto en el pinning service:", error);
  }

  const { error: deleteError } = await supabase.from("files").delete().eq("id", file.id);
  if (deleteError) {
    return { error: "No se pudo borrar el archivo de tu drive." };
  }

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "delete",
    metadata: { fileName: file.name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/files");
  return { success: true };
}

export async function renameFileAction(input: unknown) {
  const parsed = renameFileSchema.safeParse(input);
  if (!parsed.success) return { error: "Nombre inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("files")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.fileId);

  if (error) return { error: "No se pudo renombrar el archivo." };

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "rename",
    file_id: parsed.data.fileId,
    metadata: { fileName: parsed.data.name },
  });

  revalidatePath("/dashboard/files");
  return { success: true };
}

export async function moveFileAction(input: unknown) {
  const parsed = moveFileSchema.safeParse(input);
  if (!parsed.success) return { error: "Solicitud de mover archivo inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("files")
    .update({ folder_id: parsed.data.folderId })
    .eq("id", parsed.data.fileId);

  if (error) return { error: "No se pudo mover el archivo." };

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "move",
    file_id: parsed.data.fileId,
    metadata: {},
  });

  revalidatePath("/dashboard/files");
  return { success: true };
}
