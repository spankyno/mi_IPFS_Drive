"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { deleteFolderAction, renameFolderAction } from "@/lib/actions/files";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import type { DriveFolder } from "@/types/domain";

export function FolderActionsMenu({
  folder,
  onChanged,
}: {
  folder: DriveFolder;
  onChanged: () => void;
}) {
  const [isBusy, setIsBusy] = React.useState(false);

  async function handleRename() {
    const newName = window.prompt("Nuevo nombre de la carpeta:", folder.name);
    if (!newName || newName.trim() === "" || newName === folder.name) return;

    setIsBusy(true);
    const result = await renameFolderAction({ folderId: folder.id, name: newName.trim() });
    setIsBusy(false);

    if (result.error) {
      toast.error("No se pudo renombrar", { description: result.error });
    } else {
      toast.success("Carpeta renombrada");
      onChanged();
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Borrar la carpeta "${folder.name}"? Las subcarpetas se borrarán también. Los archivos que contenga NO se eliminan: se moverán a la raíz de tu drive.`
    );
    if (!confirmed) return;

    setIsBusy(true);
    const result = await deleteFolderAction({ folderId: folder.id });
    setIsBusy(false);

    if (result.error) {
      toast.error("No se pudo borrar la carpeta", { description: result.error });
    } else {
      toast.success(`Carpeta "${folder.name}" eliminada`);
      onChanged();
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background/80 hover:text-foreground group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
          aria-label={`Más acciones para la carpeta ${folder.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {isBusy ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
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
          <DropdownMenu.Item
            onSelect={handleRename}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
          >
            <Pencil className="size-4" /> Renombrar
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
