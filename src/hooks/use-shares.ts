"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getSharesForFile } from "@/lib/supabase/queries";

export function sharesKey(fileId: string) {
  return ["shares", fileId] as const;
}

export function useShares(fileId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: sharesKey(fileId ?? ""),
    queryFn: () => getSharesForFile(supabase, fileId as string),
    enabled: !!fileId,
  });
}

export function useInvalidateShares() {
  const queryClient = useQueryClient();
  return (fileId: string) => queryClient.invalidateQueries({ queryKey: sharesKey(fileId) });
}
