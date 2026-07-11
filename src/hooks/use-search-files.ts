"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { searchFiles, getAllTags } from "@/lib/supabase/queries";

export function useSearchFiles(userId: string, query: string, tags: string[]) {
  const supabase = createClient();
  const isActive = query.trim() !== "" || tags.length > 0;

  return useQuery({
    queryKey: ["search-files", userId, query, tags],
    queryFn: () => searchFiles(supabase, userId, { query, tags }),
    enabled: isActive,
  });
}

export function useAllTags(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["all-tags", userId],
    queryFn: () => getAllTags(supabase, userId),
    staleTime: 30_000,
  });
}
