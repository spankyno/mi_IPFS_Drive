import { createClient } from "@/lib/supabase/server";
import { getPubliclySharedFiles, getAllSharesForUser } from "@/lib/supabase/queries";
import { SharedFilesView } from "@/components/files/shared-files-view";

export default async function SharedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [publicFiles, shares] = await Promise.all([
    getPubliclySharedFiles(supabase, userId),
    getAllSharesForUser(supabase, userId),
  ]);

  return <SharedFilesView userId={userId} initialPublicFiles={publicFiles} initialShares={shares} />;
}
