import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Hola, {user?.email?.split("@")[0]} 👋
      </h1>
      <p className="mt-1 text-muted-foreground">
        Auth funcionando. El panel completo (stats, storage bar, feed de actividad) llega en el Paso 3.
      </p>
    </div>
  );
}
