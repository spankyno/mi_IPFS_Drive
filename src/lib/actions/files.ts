"use server";

import { createClient } from "@/lib/supabase/server";
import { getPinningAdapter } from "@/lib/ipfs/pinning-provider";
import { getMyLimits } from "@/lib/supabase/queries";
import {
  createFolderSchema,
  finalizeUploadSchema,
  renameFileSchema,
  moveFileSchema,
  deleteFileSchema,
  deleteFolderSchema,
  renameFolderSchema,
  updateTagsSchema,
  setVisibilitySchema,
  createShareSchema,
  revokeShareSchema,
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
      is_encrypted: parsed.data.isEncrypted,
      encryption_iv: parsed.data.encryptionIv,
      encryption_key: parsed.data.encryptionKey,
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

/**
 * Borra una carpeta. Por las FKs de la migración 0001: las subcarpetas se
 * borran en cascada (parent_id ON DELETE CASCADE), y los archivos que
 * estaban dentro de la carpeta (o de sus subcarpetas) NO se borran —
 * quedan con folder_id = null, es decir, "suben" a la raíz del drive.
 */
export async function deleteFolderAction(input: unknown) {
  const parsed = deleteFolderSchema.safeParse(input);
  if (!parsed.success) return { error: "Solicitud de borrado inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: folder, error: fetchError } = await supabase
    .from("folders")
    .select("id, name")
    .eq("id", parsed.data.folderId)
    .single();

  if (fetchError || !folder) return { error: "Carpeta no encontrada." };

  const { error: deleteError } = await supabase.from("folders").delete().eq("id", folder.id);
  if (deleteError) return { error: "No se pudo borrar la carpeta." };

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "delete",
    metadata: { folderName: folder.name },
  });

  revalidatePath("/dashboard/files");
  return { success: true };
}

export async function renameFolderAction(input: unknown) {
  const parsed = renameFolderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nombre inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("folders")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.folderId);

  if (error) return { error: "No se pudo renombrar la carpeta." };

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "rename",
    folder_id: parsed.data.folderId,
    metadata: { folderName: parsed.data.name },
  });

  revalidatePath("/dashboard/files");
  return { success: true };
}

export async function updateTagsAction(input: unknown) {
  const parsed = updateTagsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Tags inválidas." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase
    .from("files")
    .update({ tags: parsed.data.tags })
    .eq("id", parsed.data.fileId);

  if (error) return { error: "No se pudieron actualizar las tags." };

  revalidatePath("/dashboard/files");
  return { success: true };
}

/** Alterna la visibilidad de un archivo: 'private' | 'public' | 'unlisted'. En 'public', el enlace por CID (`/share/cid/<cid>`) es accesible por cualquiera. */
export async function setVisibilityAction(input: unknown) {
  const parsed = setVisibilitySchema.safeParse(input);
  if (!parsed.success) return { error: "Solicitud de visibilidad inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: file, error } = await supabase
    .from("files")
    .update({ visibility: parsed.data.visibility })
    .eq("id", parsed.data.fileId)
    .select("id, cid, name")
    .single();

  if (error || !file) return { error: "No se pudo actualizar la visibilidad." };

  if (parsed.data.visibility === "public") {
    await supabase.from("activity_log").insert({
      owner_id: user.id,
      action: "share",
      file_id: file.id,
      metadata: { fileName: file.name },
    });
  }

  revalidatePath("/dashboard/files");
  return { success: true, cid: file.cid };
}

/**
 * Crea un enlace privado revocable (token aleatorio, vía la tabla
 * `shares`). A diferencia de marcar el archivo como 'public', esto NO
 * cambia la visibilidad del archivo — sigue siendo privado salvo para
 * quien tenga el enlace exacto con el token (resuelto vía la función RPC
 * `get_shared_file`, ver migración 0003).
 */
export async function createShareAction(input: unknown) {
  const parsed = createShareSchema.safeParse(input);
  if (!parsed.success) return { error: "Solicitud de compartir inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Límite de enlaces privados activos según el plan del usuario (ver
  // migración 0005). Los enlaces caducados NO se borran automáticamente
  // de la tabla, pero get_my_limits cuenta TODAS las filas de `shares`
  // del usuario, caducadas o no — así que si el límite empieza a pesar
  // más de la cuenta, conviene un job de limpieza a futuro; de momento,
  // revocar manualmente libera hueco al instante.
  const limits = await getMyLimits(supabase);
  if (limits.activeSharesCount >= limits.maxActiveShares) {
    return {
      error: `Has alcanzado el límite de ${limits.maxActiveShares} enlaces de compartición de tu plan (${limits.planDisplayName}). Revoca alguno o mejora de plan.`,
    };
  }

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: file } = await supabase.from("files").select("name").eq("id", parsed.data.fileId).single();

  const { data: share, error } = await supabase
    .from("shares")
    .insert({
      file_id: parsed.data.fileId,
      owner_id: user.id,
      permission: parsed.data.permission,
      expires_at: expiresAt,
    })
    .select("id, share_token, permission, expires_at, created_at")
    .single();

  if (error || !share) return { error: "No se pudo crear el enlace privado." };

  await supabase.from("activity_log").insert({
    owner_id: user.id,
    action: "share",
    file_id: parsed.data.fileId,
    metadata: { fileName: file?.name ?? "un archivo" },
  });

  revalidatePath("/dashboard/files");
  return {
    success: true,
    share: {
      id: share.id,
      shareToken: share.share_token,
      permission: share.permission,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
    },
  };
}

export async function revokeShareAction(input: unknown) {
  const parsed = revokeShareSchema.safeParse(input);
  if (!parsed.success) return { error: "Solicitud de revocación inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase.from("shares").delete().eq("id", parsed.data.shareId);
  if (error) return { error: "No se pudo revocar el enlace." };

  revalidatePath("/dashboard/files");
  return { success: true };
}
