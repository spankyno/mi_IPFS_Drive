"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getMyLimits } from "@/lib/supabase/queries";
import type { UserLimits } from "@/types/domain";

// Overloads: con initialData, TS sabe que `data` nunca es undefined
// (coincide con el comportamiento real de TanStack Query en runtime).
export function useMyLimits(userId: string, initialData: UserLimits): UseQueryResult<UserLimits, Error> & { data: UserLimits };
export function useMyLimits(userId: string, initialData?: undefined): UseQueryResult<UserLimits, Error>;
export function useMyLimits(userId: string, initialData?: UserLimits) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["my-limits", userId],
    queryFn: () => getMyLimits(supabase),
    initialData,
    refetchInterval: 60_000,
  });
}
