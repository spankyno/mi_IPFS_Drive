"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Tags, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function TagFilter({
  allTags,
  selected,
  onChange,
}: {
  allTags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" className={cn(selected.length > 0 && "border-primary text-primary")}>
          <Tags className="size-4" />
          Tags
          {selected.length > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
              {selected.length}
            </span>
          )}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-50 max-h-72 min-w-52 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-fade-in"
        >
          {allTags.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              Todavía no has etiquetado ningún archivo.
            </p>
          ) : (
            allTags.map((tag) => (
              <DropdownMenu.Item
                key={tag}
                onSelect={(e) => {
                  e.preventDefault(); // no cerrar el menú al seleccionar, para poder marcar varias
                  toggle(tag);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
              >
                <span className={cn("flex size-4 items-center justify-center rounded border", selected.includes(tag) && "border-primary bg-primary text-primary-foreground")}>
                  {selected.includes(tag) && <Check className="size-3" />}
                </span>
                {tag}
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
