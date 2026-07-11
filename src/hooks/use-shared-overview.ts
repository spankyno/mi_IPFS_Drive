"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getPubliclySharedFiles, getAllSharesForUser } from "@/lib/supabase/queries";
import type { DriveFile, FileShare } from "@/types/domain";

export function useMyPublicFiles(userId: string, initialData: DriveFile[]) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["public-files", userId],
    queryFn: () => getPubliclySharedFiles(supabase, userId),
    initialData,
  });
}

export function useMyShares(
  userId: string,
  initialData: (FileShare & { fileName: string; fileCid: string })[]
) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["my-shares", userId],
    queryFn: () => getAllSharesForUser(supabase, userId),
    initialData,
  });
}

export function useInvalidateSharedOverview(userId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["public-files", userId] });
    queryClient.invalidateQueries({ queryKey: ["my-shares", userId] });
  };
}
