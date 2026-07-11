"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createFolderAction, type FileActionState } from "@/lib/actions/files";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, AlertCircle } from "lucide-react";

const initialState: FileActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      Crear carpeta
    </Button>
  );
}

export function CreateFolderDialog({ parentId }: { parentId: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createFolderAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FolderPlus className="size-4" />
        Nueva carpeta
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear carpeta</DialogTitle>
          <DialogDescription>Organiza tus archivos en una nueva carpeta.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="parentId" value={parentId ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nombre</Label>
            <Input id="folder-name" name="name" placeholder="Ej. Facturas 2026" autoFocus required />
          </div>
          {state.error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </p>
          )}
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
