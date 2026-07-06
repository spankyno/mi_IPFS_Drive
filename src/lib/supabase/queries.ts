import type { Database } from "@/types/database";
import type { DriveFile, ActivityLogEntry, StorageUsage, DriveFolder } from "@/types/domain";
import type { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import type { createClient as createServerSupabase } from "@/lib/supabase/server";

/**
 * Derivamos el tipo del cliente directamente de nuestras propias factories
 * (browser y server) en vez de reconstruir `SupabaseClient<Database>` a
 * mano. @supabase/ssr resuelve sus generics de forma distinta a
 * @supabase/supabase-js al usar un único type-arg, y comparar ambos tipos
 * "desde fuera" produce falsos mismatches en TS estricto. Usar el tipo tal
 * cual sale de nuestras factories garantiza compatibilidad estructural real.
 */
type TypedClient =
  | ReturnType<typeof createBrowserSupabase>
  | Awaited<ReturnType<typeof createServerSupabase>>;

const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB — coincide con el default de la tabla profiles

function mapFileRow(row: Database["public"]["Tables"]["files"]["Row"]): DriveFile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    folderId: row.folder_id,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    cid: row.cid,
    storageKey: row.storage_key,
    pinningProvider: row.pinning_provider as DriveFile["pinningProvider"],
    isEncrypted: row.is_encrypted,
    encryptionIv: row.encryption_iv,
    tags: row.tags,
    visibility: row.visibility,
    thumbnailCid: row.thumbnail_cid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivityRow(row: Database["public"]["Tables"]["activity_log"]["Row"]): ActivityLogEntry {
  return {
    id: row.id,
    ownerId: row.owner_id,
    action: row.action as ActivityLogEntry["action"],
    fileId: row.file_id,
    folderId: row.folder_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

/** Uso de almacenamiento del usuario (vista `storage_usage` + cuota de `profiles`). */
export async function getStorageUsage(supabase: TypedClient, userId: string): Promise<StorageUsage> {
  const [{ data: usage }, { data: profile }] = await Promise.all([
    supabase.from("storage_usage").select("used_bytes, file_count").eq("owner_id", userId).maybeSingle(),
    supabase.from("profiles").select("storage_quota_bytes").eq("id", userId).single(),
  ]);

  return {
    usedBytes: usage?.used_bytes ?? 0,
    fileCount: usage?.file_count ?? 0,
    quotaBytes: profile?.storage_quota_bytes ?? DEFAULT_QUOTA_BYTES,
  };
}

/** Archivos más recientes del usuario (para la sección "Archivos recientes"). */
export async function getRecentFiles(supabase: TypedClient, userId: string, limit = 8): Promise<DriveFile[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapFileRow);
}

/** Feed de actividad reciente (uploads, shares, etc.) del usuario. */
export async function getRecentActivity(supabase: TypedClient, userId: string, limit = 15): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapActivityRow);
}

/** Conteo de shares activos (enlaces creados) del usuario, para las stats cards. */
export async function getActiveSharesCount(supabase: TypedClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("shares")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) throw error;
  return count ?? 0;
}

/** Conteo de carpetas del usuario. */
export async function getFoldersCount(supabase: TypedClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("folders")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (error) throw error;
  return count ?? 0;
}

function mapFolderRow(row: Database["public"]["Tables"]["folders"]["Row"]): DriveFolder {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Carpetas y archivos directamente dentro de `folderId` (null = raíz). */
export async function getFolderContents(
  supabase: TypedClient,
  userId: string,
  folderId: string | null
): Promise<{ folders: DriveFolder[]; files: DriveFile[] }> {
  const [{ data: folderRows, error: foldersError }, { data: fileRows, error: filesError }] =
    await Promise.all([
      folderId
        ? supabase.from("folders").select("*").eq("owner_id", userId).eq("parent_id", folderId)
        : supabase.from("folders").select("*").eq("owner_id", userId).is("parent_id", null),
      folderId
        ? supabase.from("files").select("*").eq("owner_id", userId).eq("folder_id", folderId)
        : supabase.from("files").select("*").eq("owner_id", userId).is("folder_id", null),
    ]);

  if (foldersError) throw foldersError;
  if (filesError) throw filesError;

  return {
    folders: (folderRows ?? [])
      .map(mapFolderRow)
      .sort((a, b) => a.name.localeCompare(b.name)),
    files: (fileRows ?? []).map(mapFileRow).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

/** Ruta de breadcrumb desde la raíz hasta `folderId` (inclusive), subiendo por parent_id. */
export async function getFolderPath(supabase: TypedClient, folderId: string): Promise<DriveFolder[]> {
  const path: DriveFolder[] = [];
  let currentId: string | null = folderId;

  // Los árboles de carpetas de un usuario son pequeños en la práctica;
  // iterar uno a uno es más simple y suficientemente rápido que una CTE recursiva.
  while (currentId) {
    const { data, error } = await supabase.from("folders").select("*").eq("id", currentId).single();
    if (error || !data) break;
    const folder = mapFolderRow(data);
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}
