"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, ExternalLink, Copy, Trash2, Loader2 } from "lucide-react";
import { deleteFileAction } from "@/lib/actions/files";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import type { DriveFile } from "@/types/domain";

export function FileActionsMenu({
  file,
  gatewayUrl,
  onDeleted,
}: {
  file: DriveFile;
  gatewayUrl: string;
  onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleDelete() {
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

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
          aria-label={`Más acciones para ${file.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "z-50 min-w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[state=open]:animate-fade-in"
          )}
        >
          <DropdownMenu.Item asChild>
            <a
              href={gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            >
              <ExternalLink className="size-4" /> Abrir en IPFS
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleCopyLink}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
          >
            <Copy className="size-4" /> Copiar enlace
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={handleDelete}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
          >
            <Trash2 className="size-4" /> Eliminar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
