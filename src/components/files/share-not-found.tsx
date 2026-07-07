import Link from "next/link";
import { HardDrive, FileX } from "lucide-react";

export function ShareNotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-2 border-b p-4 font-semibold">
        <Link href="/" className="flex items-center gap-2">
          <HardDrive className="size-5 text-primary" />
          mi_IPFS_Drive
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <FileX className="size-12 text-muted-foreground/40" />
        <div>
          <p className="font-medium">Este enlace no está disponible</p>
          <p className="text-sm text-muted-foreground">
            Puede que haya caducado, haya sido revocado, o que el archivo ya no sea público.
          </p>
        </div>
      </main>
    </div>
  );
}
