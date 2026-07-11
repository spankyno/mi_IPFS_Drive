"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useShares, useInvalidateShares } from "@/hooks/use-shares";
import { useMyLimits } from "@/hooks/use-my-limits";
import { setVisibilityAction, createShareAction, revokeShareAction } from "@/lib/actions/files";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { Copy, Globe, Link2, Trash2, Loader2 } from "lucide-react";
import type { DriveFile } from "@/types/domain";

function siteOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function ShareDialog({
  file,
  userId,
  onClose,
  onVisibilityChanged,
}: {
  file: DriveFile | null;
  userId: string;
  onClose: () => void;
  onVisibilityChanged: (visibility: DriveFile["visibility"]) => void;
}) {
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [permission, setPermission] = useState<"view" | "download">("view");
  const [expiresInDays, setExpiresInDays] = useState<string>("never");
  const [isCreatingShare, setIsCreatingShare] = useState(false);

  const { data: shares = [], isLoading: isLoadingShares } = useShares(file?.id ?? null);
  const invalidateShares = useInvalidateShares();
  const queryClient = useQueryClient();
  const { data: limits } = useMyLimits(userId);
  const atShareLimit = limits ? limits.activeSharesCount >= limits.maxActiveShares : false;

  if (!file) return null;

  const isPublic = file.visibility === "public";
  const publicUrl = `${siteOrigin()}/share/cid/${file.cid}`;

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  }

  async function handleTogglePublic() {
    if (!file) return;
    setIsTogglingPublic(true);
    const result = await setVisibilityAction({
      fileId: file.id,
      visibility: isPublic ? "private" : "public",
    });
    setIsTogglingPublic(false);

    if (result.error) {
      toast.error("No se pudo cambiar la visibilidad", { description: result.error });
    } else {
      onVisibilityChanged(isPublic ? "private" : "public");
    }
  }

  async function handleCreateShare() {
    if (!file) return;
    setIsCreatingShare(true);
    const result = await createShareAction({
      fileId: file.id,
      permission,
      expiresInDays: expiresInDays === "never" ? null : Number(expiresInDays),
    });
    setIsCreatingShare(false);

    if (result.error) {
      toast.error("No se pudo crear el enlace", { description: result.error });
    } else {
      toast.success("Enlace privado creado");
      invalidateShares(file.id);
      queryClient.invalidateQueries({ queryKey: ["my-limits", userId] });
    }
  }

  async function handleRevoke(shareId: string) {
    if (!file) return;
    if (!window.confirm("¿Revocar este enlace? Dejará de funcionar inmediatamente.")) return;
    const result = await revokeShareAction({ shareId });
    if (result.error) {
      toast.error("No se pudo revocar", { description: result.error });
    } else {
      toast.success("Enlace revocado");
      invalidateShares(file.id);
      queryClient.invalidateQueries({ queryKey: ["my-limits", userId] });
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">Compartir &quot;{file.name}&quot;</DialogTitle>
          <DialogDescription>Elige cómo quieres que otros accedan a este archivo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Enlace público por CID */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Enlace público</p>
                  <p className="text-xs text-muted-foreground">Cualquiera con el enlace puede verlo, sin iniciar sesión.</p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={isPublic}
                onClick={handleTogglePublic}
                disabled={isTogglingPublic}
                className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
                  isPublic ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                    isPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {isPublic && (
              <div className="mt-3 flex min-w-0 items-center gap-2">
                <input
                  readOnly
                  value={publicUrl}
                  className="w-full min-w-0 truncate rounded-md border bg-muted/40 px-2 py-1.5 text-xs"
                />
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => copyToClipboard(publicUrl, "Enlace")}>
                  <Copy className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Enlaces privados */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">Enlaces privados</p>
            </div>
            <p className="text-xs text-muted-foreground">
              El archivo sigue siendo privado — solo funciona para quien tenga el enlace exacto. Puedes revocarlo cuando quieras.
              {limits && (
                <>
                  {" "}
                  ({limits.activeSharesCount}/{limits.maxActiveShares} usados en tu plan {limits.planDisplayName})
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "view" | "download")}
                disabled={atShareLimit}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
              >
                <option value="view">Solo ver</option>
                <option value="download">Ver y descargar</option>
              </select>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                disabled={atShareLimit}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
              >
                <option value="never">Nunca caduca</option>
                <option value="1">Caduca en 1 día</option>
                <option value="7">Caduca en 7 días</option>
                <option value="30">Caduca en 30 días</option>
              </select>
              <Button size="sm" onClick={handleCreateShare} isLoading={isCreatingShare} disabled={atShareLimit}>
                Crear enlace
              </Button>
            </div>

            {atShareLimit && (
              <p className="text-xs text-destructive">
                Has alcanzado el límite de enlaces de tu plan. Revoca alguno para crear otro.
              </p>
            )}

            {isLoadingShares ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length > 0 ? (
              <ul className="scrollbar-thin max-h-40 space-y-1.5 overflow-y-auto">
                {shares.map((share) => {
                  const url = `${siteOrigin()}/share/token/${share.shareToken}`;
                  return (
                    <li key={share.id} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono">{url}</p>
                        <p className="text-muted-foreground">
                          {share.permission === "download" ? "Ver y descargar" : "Solo ver"} ·{" "}
                          {share.expiresAt
                            ? `caduca ${formatRelativeTime(share.expiresAt)}`
                            : "sin caducidad"}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(url, "Enlace")}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Copiar enlace"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleRevoke(share.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Revocar enlace"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">Ningún enlace privado activo.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
