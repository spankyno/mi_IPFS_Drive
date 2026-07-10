import Link from "next/link";
import { HardDrive, Download, ExternalLink } from "lucide-react";
import { formatBytes, formatRelativeTime } from "@/lib/utils/format";
import { PublicMediaPreview } from "@/components/files/public-media-preview";

export function PublicFileView({
  name,
  mimeType,
  sizeBytes,
  createdAt,
  cid,
  gatewayUrl,
  allowDownload,
  isEncrypted,
  encryptionKey,
  encryptionIv,
}: {
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  cid: string;
  gatewayUrl: string;
  allowDownload: boolean;
  isEncrypted: boolean;
  encryptionKey: string | null;
  encryptionIv: string | null;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-2 border-b p-4 font-semibold">
        <Link href="/" className="flex items-center gap-2">
          <HardDrive className="size-5 text-primary" />
          mi_IPFS_Drive
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4 rounded-xl border p-6">
          <PublicMediaPreview
            name={name}
            mimeType={mimeType}
            cid={cid}
            isEncrypted={isEncrypted}
            encryptionKey={encryptionKey}
            encryptionIv={encryptionIv}
          >
            {({ mediaUrl }) => (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(sizeBytes)} · Compartido {formatRelativeTime(createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {allowDownload && mediaUrl && (
                    <a
                      href={mediaUrl}
                      download={name}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Download className="size-4" /> Descargar
                    </a>
                  )}
                  {!isEncrypted && (
                    <a
                      href={gatewayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <ExternalLink className="size-4" /> Abrir en IPFS
                    </a>
                  )}
                </div>
              </div>
            )}
          </PublicMediaPreview>

          {!allowDownload && (
            <p className="text-xs text-muted-foreground">
              Este enlace es de solo visualización — quien lo compartió no habilitó la descarga directa.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
