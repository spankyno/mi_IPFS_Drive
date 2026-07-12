import Link from "next/link";
import { HardDrive } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Panel de marca — oculto en mobile */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <HardDrive className="size-6" />
          mi_IPFS_Drive
        </Link>
        <div className="space-y-3">
          <p className="text-2xl font-medium leading-snug">
            Tus archivos, en una red que nadie controla.
          </p>
          <p className="text-sm text-primary-foreground/80">
            Almacenamiento descentralizado sobre IPFS. Sin servidor central, sin punto único de fallo.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} mi_IPFS_Drive
        </p>
      </div>

      {/* Panel del formulario */}
      <div className="flex flex-col p-6 lg:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold lg:hidden">
            <HardDrive className="size-6 text-primary" />
            mi_IPFS_Drive
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm animate-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
