"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useFolderContents, useInvalidateFolderContents } from "@/hooks/use-folder-contents";
import { useFileUpload } from "@/hooks/use-file-upload";
import { UploadProgressPanel } from "@/components/files/upload-progress-panel";
import { CreateFolderDialog } from "@/components/files/create-folder-dialog";
import { FileBreadcrumb } from "@/components/files/file-breadcrumb";
import { FileActionsMenu } from "@/components/files/file-actions-menu";
import { FolderActionsMenu } from "@/components/files/folder-actions-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes, formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  Upload,
  Folder,
  FileImage,
  FileVideo,
  FileText,
  File as FileIcon,
  LayoutGrid,
  List,
  Search,
  UploadCloud,
} from "lucide-react";
import type { DriveFile, DriveFolder } from "@/types/domain";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.io/ipfs";

function iconForMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText;
  return FileIcon;
}

interface FileExplorerProps {
  userId: string;
  folderId: string | null;
  path: DriveFolder[];
  initialData: { folders: DriveFolder[]; files: DriveFile[] };
}

export function FileExplorer({ userId, folderId, path, initialData }: FileExplorerProps) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const { data } = useFolderContents(userId, folderId, initialData);
  const invalidate = useInvalidateFolderContents(userId);
  const { tasks, uploadFiles, dismissTask } = useFileUpload(userId, folderId);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted) => {
      if (accepted.length > 0) uploadFiles(accepted);
    },
  });

  const filteredFolders = useMemo(
    () => data.folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [data.folders, search]
  );
  const filteredFiles = useMemo(
    () => data.files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [data.files, search]
  );

  const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;

  function goToFolder(id: string | null) {
    router.push(id ? `/dashboard/files?folder=${id}` : "/dashboard/files");
  }

  return (
    <div {...getRootProps()} className="relative flex h-full flex-col p-4 lg:p-8">
      <input {...getInputProps()} />

      {/* Overlay de drag & drop */}
      {isDragActive && (
        <div className="pointer-events-none absolute inset-4 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 lg:inset-8">
          <div className="flex flex-col items-center gap-2 text-primary">
            <UploadCloud className="size-10" />
            <p className="font-medium">Suelta los archivos para subirlos a IPFS</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <FileBreadcrumb path={path} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en esta carpeta…"
              className="pl-8"
            />
          </div>

          <CreateFolderDialog parentId={folderId} />

          <Button onClick={open}>
            <Upload className="size-4" />
            Subir archivos
          </Button>

          <div className="flex overflow-hidden rounded-md border">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "flex size-10 items-center justify-center",
                view === "grid" ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent"
              )}
              aria-label="Vista de cuadrícula"
              aria-pressed={view === "grid"}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex size-10 items-center justify-center border-l",
                view === "list" ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent"
              )}
              aria-label="Vista de lista"
              aria-pressed={view === "list"}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState hasSearch={search.length > 0} onUploadClick={open} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              className="group relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <div className="absolute right-1.5 top-1.5">
                <FolderActionsMenu folder={folder} onChanged={() => invalidate(folderId)} />
              </div>
              <button onClick={() => goToFolder(folder.id)} className="flex flex-col items-center gap-2">
                <Folder className="size-9 fill-amber-400/20 text-amber-500" />
                <p className="w-full max-w-32 truncate text-sm font-medium">{folder.name}</p>
              </button>
            </div>
          ))}
          {filteredFiles.map((file) => {
            const Icon = iconForMime(file.mimeType);
            return (
              <div
                key={file.id}
                className="group relative flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className="absolute right-1.5 top-1.5">
                  <FileActionsMenu
                    file={file}
                    gatewayUrl={`${GATEWAY}/${file.cid}`}
                    onDeleted={() => invalidate(folderId)}
                  />
                </div>
                <a
                  href={`${GATEWAY}/${file.cid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2"
                >
                  <Icon className="size-9 text-muted-foreground group-hover:text-primary" />
                  <p className="w-full max-w-32 truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Tamaño</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Modificado</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredFolders.map((folder) => (
                <tr key={folder.id} className="group hover:bg-accent">
                  <td
                    onClick={() => goToFolder(folder.id)}
                    className="flex cursor-pointer items-center gap-2 px-4 py-2.5 font-medium"
                  >
                    <Folder className="size-4 fill-amber-400/20 text-amber-500" /> {folder.name}
                  </td>
                  <td
                    onClick={() => goToFolder(folder.id)}
                    className="hidden cursor-pointer px-4 py-2.5 text-muted-foreground sm:table-cell"
                  >
                    —
                  </td>
                  <td
                    onClick={() => goToFolder(folder.id)}
                    className="hidden cursor-pointer px-4 py-2.5 text-muted-foreground sm:table-cell"
                  >
                    {formatRelativeTime(folder.updatedAt)}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <FolderActionsMenu folder={folder} onChanged={() => invalidate(folderId)} />
                  </td>
                </tr>
              ))}
              {filteredFiles.map((file) => {
                const Icon = iconForMime(file.mimeType);
                return (
                  <tr key={file.id} className="group hover:bg-accent">
                    <td className="px-4 py-2.5">
                      <a
                        href={`${GATEWAY}/${file.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-medium"
                      >
                        <Icon className="size-4 text-muted-foreground" /> {file.name}
                      </a>
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                      {formatRelativeTime(file.createdAt)}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <FileActionsMenu
                        file={file}
                        gatewayUrl={`${GATEWAY}/${file.cid}`}
                        onDeleted={() => invalidate(folderId)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UploadProgressPanel tasks={tasks} onDismiss={dismissTask} />
    </div>
  );
}

function EmptyState({ hasSearch, onUploadClick }: { hasSearch: boolean; onUploadClick: () => void }) {
  if (hasSearch) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <Search className="size-8 text-muted-foreground/40" />
        <p>No hay nada que coincida con tu búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UploadCloud className="size-7" />
      </div>
      <div>
        <p className="font-medium">Esta carpeta está vacía</p>
        <p className="text-sm text-muted-foreground">Arrastra archivos aquí o usa el botón de subir.</p>
      </div>
      <Button onClick={onUploadClick}>
        <Upload className="size-4" /> Subir archivos
      </Button>
    </div>
  );
}
