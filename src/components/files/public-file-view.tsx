import Link from "next/link";
import { HardDrive, Download, ExternalLink, FileImage, FileVideo, FileText, File as FileIcon } from "lucide-react";
import { formatBytes, formatRelativeTime } from "@/lib/utils/format";

function iconForMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText;
  return FileIcon;
}

export function PublicFileView({
  name,
  mimeType,
  sizeBytes,
  createdAt,
  gatewayUrl,
  allowDownload,
}: {
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  gatewayUrl: string;
  allowDownload: boolean;
}) {
  const Icon = iconForMime(mimeType);

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
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            {mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagen servida desde un gateway IPFS externo dinámico
              <img src={gatewayUrl} alt={name} className="max-h-96 w-full object-contain" />
            ) : mimeType.startsWith("video/") ? (
              <video src={gatewayUrl} controls className="max-h-96 w-full" />
            ) : mimeType === "application/pdf" ? (
              <iframe src={gatewayUrl} title={name} className="h-96 w-full" />
            ) : (
              <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
                <Icon className="size-14" />
                <p className="text-sm">No hay vista previa disponible para este tipo de archivo.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(sizeBytes)} · Compartido {formatRelativeTime(createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              {allowDownload && (
                <a
                  href={gatewayUrl}
                  download={name}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="size-4" /> Descargar
                </a>
              )}
              <a
                href={gatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                <ExternalLink className="size-4" /> Abrir en IPFS
              </a>
            </div>
          </div>

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
