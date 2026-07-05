"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import { LogOut, User } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";

interface UserMenuProps {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function UserMenu({ email, displayName, avatarUrl }: UserMenuProps) {
  const initials = (displayName ?? email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Menú de usuario"
        >
          <Avatar.Root className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-primary-foreground">
            <Avatar.Image src={avatarUrl ?? undefined} alt={displayName ?? email} className="size-full object-cover" />
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 min-w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[state=open]:animate-fade-in"
          )}
        >
          <div className="flex items-center gap-2 px-2 py-1.5">
            <User className="size-4 text-muted-foreground" />
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{displayName ?? "Mi cuenta"}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <form action={signOutAction}>
            <DropdownMenu.Item asChild>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
              >
                <LogOut className="size-4" /> Cerrar sesión
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
