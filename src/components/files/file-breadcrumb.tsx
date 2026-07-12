"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DriveFolder } from "@/types/domain";

const FILE_DRAG_MIME = "application/x-mi-ipfs-drive-file-id";

export function FileBreadcrumb({
  path,
  onDropFile,
}: {
  path: DriveFolder[];
  onDropFile?: (fileId: string, targetFolderId: string | null) => void;
}) {
  const [dragOverId, setDragOverId] = useState<string | null>(null); // null = raíz "Mi drive"

  function dragOverProps(targetId: string | null) {
    if (!onDropFile) return {};
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(FILE_DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverId(targetId ?? "__root__");
      },
      onDragLeave: () => setDragOverId((cur) => (cur === (targetId ?? "__root__") ? null : cur)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverId(null);
        const fileId = e.dataTransfer.getData(FILE_DRAG_MIME);
        if (fileId) onDropFile(fileId, targetId);
      },
    };
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Ruta de carpetas">
      <Link
        href="/dashboard/files"
        {...dragOverProps(null)}
        className={cn(
          "flex items-center gap-1.5 rounded px-1 hover:text-foreground",
          dragOverId === "__root__" && "bg-primary/10 text-primary ring-1 ring-primary"
        )}
      >
        <HardDrive className="size-4" />
        Mi drive
      </Link>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5" />
          <Link
            href={`/dashboard/files?folder=${folder.id}`}
            {...dragOverProps(folder.id)}
            className={cn(
              "rounded px-1 hover:text-foreground",
              dragOverId === folder.id && "bg-primary/10 text-primary ring-1 ring-primary"
            )}
          >
            {folder.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
