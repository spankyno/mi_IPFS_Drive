import { createClient } from "@/lib/supabase/server";
import {
  getMyLimits,
  getRecentFiles,
  getRecentActivity,
  getFoldersCount,
} from "@/lib/supabase/queries";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { StorageUsageBar } from "@/components/dashboard/storage-usage-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RecentFiles } from "@/components/dashboard/recent-files";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El middleware + el layout ya garantizan que hay user; el `!` es seguro aquí.
  const userId = user!.id;

  // Todas las queries en paralelo: reduce el tiempo hasta el primer byte útil.
  const [limits, recentFiles, recentActivity, foldersCount] = await Promise.all([
    getMyLimits(supabase),
    getRecentFiles(supabase, userId),
    getRecentActivity(supabase, userId),
    getFoldersCount(supabase, userId),
  ]);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {user?.email?.split("@")[0]} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Este es el estado de tu drive descentralizado.</p>
      </div>

      <StatsCards
        fileCount={limits.fileCount}
        usedBytes={limits.usedBytes}
        sharesCount={limits.activeSharesCount}
        foldersCount={foldersCount}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RecentFiles userId={userId} initialData={recentFiles} />
          <StorageUsageBar userId={userId} initialData={limits} />
        </div>
        <ActivityFeed userId={userId} initialData={recentActivity} />
      </div>
    </div>
  );
}
