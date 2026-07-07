"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/files/tag-input";
import { renameFileAction, updateTagsAction, deleteFileAction } from "@/lib/actions/files";
import { formatBytes, formatRelativeTime, truncateCid } from "@/lib/utils/format";
import { toast } from "sonner";
import {
  FileImage,
  FileVideo,
  FileText,
  File as FileIcon,
  ExternalLink,
  Copy,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import type { DriveFile } from "@/types/domain";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.filebase.io/ipfs";

function iconForMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText;
  return FileIcon;
}

interface FilePreviewDialogProps {
  file: DriveFile | null;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}

export function FilePreviewDialog({ file, onClose, onChanged, onDeleted }: FilePreviewDialogProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sincroniza el estado editable cada vez que se abre un archivo distinto.
  useEffect(() => {
    if (file) {
      setNameDraft(file.name);
      setTags(file.tags);
      setIsEditingName(false);
    }
  }, [file]);

  if (!file) return null;

  const gatewayUrl = `${GATEWAY}/${file.cid}`;

  async function handleSaveName() {
    if (!file || nameDraft.trim() === "" || nameDraft === file.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    const result = await renameFileAction({ fileId: file.id, name: nameDraft.trim() });
    setIsSavingName(false);
    setIsEditingName(false);

    if (result.error) {
      toast.error("No se pudo renombrar", { description: result.error });
    } else {
      toast.success("Archivo renombrado");
      onChanged();
    }
  }

  async function handleTagsChange(newTags: string[]) {
    if (!file) return;
    setTags(newTags);
    setIsSavingTags(true);
    const result = await updateTagsAction({ fileId: file.id, tags: newTags });
    setIsSavingTags(false);

    if (result.error) {
      toast.error("No se pudieron guardar las tags", { description: result.error });
    } else {
      onChanged();
    }
  }

  async function handleDelete() {
    if (!file) return;
    if (!window.confirm(`¿Borrar "${file.name}"? Se despineará de IPFS y dejará de estar disponible.`)) {
      return;
    }
    setIsDeleting(true);
    const result = await deleteFileAction({ fileId: file.id });
    setIsDeleting(false);

    if (result.error) {
      toast.error("No se pudo borrar el archivo", { description: result.error });
    } else {
      toast.success(`"${file.name}" eliminado`);
      onDeleted();
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(gatewayUrl);
    toast.success("Enlace copiado al portapapeles");
  }

  const Icon = iconForMime(file.mimeType);

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                autoFocus
                className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button onClick={handleSaveName} disabled={isSavingName} className="text-primary hover:opacity-80">
                {isSavingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </button>
              <button onClick={() => setIsEditingName(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <DialogTitle className="flex items-center gap-2 pr-6">
              <span className="truncate">{file.name}</span>
              <button
                onClick={() => setIsEditingName(true)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Renombrar archivo"
              >
                <Pencil className="size-3.5" />
              </button>
            </DialogTitle>
          )}
          <DialogDescription>
            {formatBytes(file.sizeBytes)} · Subido {formatRelativeTime(file.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          {/* Zona de previsualización */}
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            {file.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagen servida desde un gateway IPFS externo dinámico
              <img src={gatewayUrl} alt={file.name} className="max-h-96 w-full object-contain" />
            ) : file.mimeType.startsWith("video/") ? (
              <video src={gatewayUrl} controls className="max-h-96 w-full" />
            ) : file.mimeType === "application/pdf" ? (
              <iframe src={gatewayUrl} title={file.name} className="h-96 w-full" />
            ) : (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                <Icon className="size-12" />
                <p className="text-sm">No hay vista previa disponible para este tipo de archivo.</p>
                <a
                  href={gatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Abrir en IPFS
                </a>
              </div>
            )}
          </div>

          {/* Panel de metadatos */}
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-medium text-muted-foreground">Tags</p>
              <TagInput tags={tags} onChange={handleTagsChange} disabled={isSavingTags} />
            </div>

            <dl className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="truncate font-mono text-xs">{file.mimeType}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Tamaño</dt>
                <dd>{formatBytes(file.sizeBytes)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">CID</dt>
                <dd className="truncate font-mono text-xs" title={file.cid}>
                  {truncateCid(file.cid)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Proveedor</dt>
                <dd className="capitalize">{file.pinningProvider}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" asChild>
                <a href={gatewayUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" /> Abrir en IPFS
                </a>
              </Button>
              <Button variant="outline" onClick={handleCopyLink}>
                <Copy className="size-4" /> Copiar enlace
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
