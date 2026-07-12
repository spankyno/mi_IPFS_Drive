"use client";

import { useMyPublicFiles, useMyShares, useInvalidateSharedOverview } from "@/hooks/use-shared-overview";
import { setVisibilityAction, revokeShareAction } from "@/lib/actions/files";
import { formatBytes, formatRelativeTime, truncateCid } from "@/lib/utils/format";
import { toast } from "sonner";
import { Globe, Link2, Copy, Trash2, FileImage, FileVideo, FileText, File as FileIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DriveFile, FileShare } from "@/types/domain";

function iconForMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText;
  return FileIcon;
}

function siteOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

interface SharedFilesViewProps {
  userId: string;
  initialPublicFiles: DriveFile[];
  initialShares: (FileShare & { fileName: string; fileCid: string })[];
}

export function SharedFilesView({ userId, initialPublicFiles, initialShares }: SharedFilesViewProps) {
  const { data: publicFiles } = useMyPublicFiles(userId, initialPublicFiles);
  const { data: shares } = useMyShares(userId, initialShares);
  const invalidate = useInvalidateSharedOverview(userId);

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Enlace copiado al portapapeles");
  }

  async function handleUnshare(file: DriveFile) {
    const result = await setVisibilityAction({ fileId: file.id, visibility: "private" });
    if (result.error) {
      toast.error("No se pudo dejar de compartir", { description: result.error });
    } else {
      toast.success(`"${file.name}" ya no es público`);
      invalidate();
    }
  }

  async function handleRevoke(shareId: string) {
    if (!window.confirm("¿Revocar este enlace? Dejará de funcionar inmediatamente.")) return;
    const result = await revokeShareAction({ shareId });
    if (result.error) {
      toast.error("No se pudo revocar", { description: result.error });
    } else {
      toast.success("Enlace revocado");
      invalidate();
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compartidos</h1>
        <p className="mt-1 text-muted-foreground">Archivos públicos y enlaces privados que has creado.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Globe className="size-4 text-muted-foreground" />
            Enlaces públicos ({publicFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {publicFiles.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ningún archivo público todavía. Actívalo desde el diálogo de compartir de cualquier archivo.
            </p>
          ) : (
            <ul className="divide-y">
              {publicFiles.map((file) => {
                const Icon = iconForMime(file.mimeType);
                const url = `${siteOrigin()}/share/cid/${file.cid}`;
                return (
                  <li key={file.id} className="flex items-center gap-3 py-3">
                    <Icon className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatBytes(file.sizeBytes)} · {url}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyToClipboard(url)}>
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleUnshare(file)}
                    >
                      Dejar de compartir
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Link2 className="size-4 text-muted-foreground" />
            Enlaces privados ({shares.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shares.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ningún enlace privado activo. Créalos desde el diálogo de compartir de cualquier archivo.
            </p>
          ) : (
            <ul className="divide-y">
              {shares.map((share) => {
                const url = `${siteOrigin()}/share/token/${share.shareToken}`;
                const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;
                return (
                  <li key={share.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{share.fileName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {share.permission === "download" ? "Ver y descargar" : "Solo ver"} ·{" "}
                        {share.expiresAt
                          ? `${isExpired ? "caducado" : "caduca"} ${formatRelativeTime(share.expiresAt)}`
                          : "sin caducidad"}{" "}
                        · <span className="font-mono">{truncateCid(url, 20)}</span>
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyToClipboard(url)}>
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRevoke(share.id)}
                    >
                      <Trash2 className="size-3.5" /> Revocar
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
