"use client";

import { useDecryptedMediaUrl } from "@/hooks/use-decrypted-media";
import { FileImage, FileVideo, FileText, File as FileIcon, Loader2, AlertCircle, Lock } from "lucide-react";

function iconForMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText;
  return FileIcon;
}

interface PublicMediaPreviewProps {
  name: string;
  mimeType: string;
  gatewayUrl: string;
  isEncrypted: boolean;
  encryptionKey: string | null;
  encryptionIv: string | null;
  /** Render-prop: el padre (Server Component) decide qué renderizar bajo la preview, con acceso a la mediaUrl ya resuelta. */
  children: (state: { mediaUrl: string | null }) => React.ReactNode;
}

export function PublicMediaPreview({
  name,
  mimeType,
  gatewayUrl,
  isEncrypted,
  encryptionKey,
  encryptionIv,
  children,
}: PublicMediaPreviewProps) {
  const { url: mediaUrl, isLoading, error } = useDecryptedMediaUrl(
    { isEncrypted, encryptionKey, encryptionIv, mimeType },
    gatewayUrl
  );
  const Icon = iconForMime(mimeType);

  return (
    <>
      <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Descifrando en tu navegador…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-destructive">
            <AlertCircle className="size-10" />
            <p className="text-sm">{error}</p>
          </div>
        ) : !mediaUrl ? null : mimeType.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element -- servida desde gateway IPFS externo o descifrada a blob: URL
          <img src={mediaUrl} alt={name} className="max-h-96 w-full object-contain" />
        ) : mimeType.startsWith("video/") ? (
          <video src={mediaUrl} controls className="max-h-96 w-full" />
        ) : mimeType === "application/pdf" ? (
          <iframe src={mediaUrl} title={name} className="h-96 w-full" />
        ) : (
          <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
            <Icon className="size-14" />
            <p className="text-sm">No hay vista previa disponible para este tipo de archivo.</p>
          </div>
        )}
      </div>

      {isEncrypted && (
        <p className="flex items-center gap-1.5 text-xs text-primary">
          <Lock className="size-3.5 shrink-0" />
          Este archivo se cifró en el navegador de quien lo subió. Se está descifrando en el tuyo — el contenido nunca viaja sin cifrar.
        </p>
      )}

      {children({ mediaUrl })}
    </>
  );
}
