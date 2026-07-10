import { createClient } from "@/lib/supabase/server";
import { PublicFileView } from "@/components/files/public-file-view";
import { ShareNotFound } from "@/components/files/share-not-found";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.filebase.io/ipfs";

export default async function PublicTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_file", { p_token: token });

  const file = data?.[0];
  if (error || !file) {
    return <ShareNotFound />;
  }

  return (
    <PublicFileView
      name={file.name}
      mimeType={file.mime_type}
      sizeBytes={file.size_bytes}
      createdAt={file.created_at}
      gatewayUrl={`${GATEWAY}/${file.cid}`}
      allowDownload={file.share_permission === "download"}
      isEncrypted={file.is_encrypted}
      encryptionKey={file.encryption_key}
      encryptionIv={file.encryption_iv}
    />
  );
}
