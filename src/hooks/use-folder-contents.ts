"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getFolderContents } from "@/lib/supabase/queries";
import type { DriveFile, DriveFolder } from "@/types/domain";

export function folderContentsKey(userId: string, folderId: string | null) {
  return ["folder-contents", userId, folderId ?? "root"] as const;
}

export function useFolderContents(
  userId: string,
  folderId: string | null,
  initialData: { folders: DriveFolder[]; files: DriveFile[] }
) {
  const supabase = createClient();

  return useQuery({
    queryKey: folderContentsKey(userId, folderId),
    queryFn: () => getFolderContents(supabase, userId, folderId),
    initialData,
  });
}

/** Helper para invalidar la carpeta actual tras subir/crear/borrar/mover algo. */
export function useInvalidateFolderContents(userId: string) {
  const queryClient = useQueryClient();
  return (folderId: string | null) =>
    queryClient.invalidateQueries({ queryKey: folderContentsKey(userId, folderId) });
}
