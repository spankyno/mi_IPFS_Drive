import { createClient } from "@/lib/supabase/server";
import { PublicFileView } from "@/components/files/public-file-view";
import { ShareNotFound } from "@/components/files/share-not-found";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.filebase.io/ipfs";

export default async function PublicCidPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;

  // Cliente sin sesión (visitante anónimo): RLS solo deja pasar filas con
  // visibility = 'public' | 'unlisted' para lecturas no autenticadas.
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("files")
    .select("name, mime_type, size_bytes, cid, visibility, created_at")
    .eq("cid", cid)
    .eq("visibility", "public")
    .maybeSingle();

  if (!file) {
    return <ShareNotFound />;
  }

  return (
    <PublicFileView
      name={file.name}
      mimeType={file.mime_type}
      sizeBytes={file.size_bytes}
      createdAt={file.created_at}
      gatewayUrl={`${GATEWAY}/${file.cid}`}
      allowDownload
    />
  );
}
