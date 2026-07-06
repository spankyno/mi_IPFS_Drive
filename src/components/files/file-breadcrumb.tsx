"use client";

import Link from "next/link";
import { ChevronRight, HardDrive } from "lucide-react";
import type { DriveFolder } from "@/types/domain";

export function FileBreadcrumb({ path }: { path: DriveFolder[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Ruta de carpetas">
      <Link href="/dashboard/files" className="flex items-center gap-1.5 hover:text-foreground">
        <HardDrive className="size-4" />
        Mi drive
      </Link>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5" />
          <Link href={`/dashboard/files?folder=${folder.id}`} className="hover:text-foreground">
            {folder.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
