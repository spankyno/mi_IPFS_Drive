"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import { LogOut, User, Sparkles } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";
import type { PlanId } from "@/types/domain";

interface UserMenuProps {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  planId: PlanId;
  planDisplayName: string;
}

export function UserMenu({ email, displayName, avatarUrl, planId, planDisplayName }: UserMenuProps) {
  const initials = (displayName ?? email).slice(0, 2).toUpperCase();
  const isPro = planId === "pro";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="relative flex items-center gap-2 rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Menú de usuario"
        >
          <Avatar.Root className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-primary-foreground">
            <Avatar.Image src={avatarUrl ?? undefined} alt={displayName ?? email} className="size-full object-cover" />
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar.Root>
          {isPro && (
            <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-amber-950 ring-2 ring-background">
              <Sparkles className="size-2.5" />
            </span>
          )}
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
          <div className="px-2 pb-1.5">
            <span
              className={cn(
                "flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                isPro ? "bg-amber-400/15 text-amber-600" : "bg-muted text-muted-foreground"
              )}
            >
              {isPro && <Sparkles className="size-3" />}
              Plan {planDisplayName}
            </span>
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
