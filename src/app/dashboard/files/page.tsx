import { createClient } from "@/lib/supabase/server";
import { getFolderContents, getFolderPath } from "@/lib/supabase/queries";
import { FileExplorer } from "@/components/files/file-explorer";

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;
  const folderId = folder ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [contents, path] = await Promise.all([
    getFolderContents(supabase, userId, folderId),
    folderId ? getFolderPath(supabase, folderId) : Promise.resolve([]),
  ]);

  return <FileExplorer userId={userId} folderId={folderId} path={path} initialData={contents} />;
}
