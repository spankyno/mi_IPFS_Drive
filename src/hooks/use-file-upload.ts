"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { finalizeUploadAction } from "@/lib/actions/files";
import { encryptFile, exportKeyToBase64 } from "@/lib/crypto/client-encryption";
import { folderContentsKey } from "@/hooks/use-folder-contents";
import type { UploadTask } from "@/types/domain";
import { toast } from "sonner";

interface RequestUploadUrlResponse {
  uploadUrl: string;
  key: string;
  error?: string;
}

/** PUT con XMLHttpRequest en vez de fetch: es la única forma de tener eventos de progreso reales en el navegador. */
function uploadWithProgress(url: string, body: Blob, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`El proveedor de pinning respondió con estado ${xhr.status}.`));
    };

    xhr.onerror = () => reject(new Error("Error de red durante la subida."));
    xhr.send(body);
  });
}

export function useFileUpload(userId: string, folderId: string | null) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const queryClient = useQueryClient();

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const uploadOne = useCallback(
    async (file: File, encrypt: boolean) => {
      const taskId = crypto.randomUUID();
      setTasks((prev) => [...prev, { id: taskId, file, progress: 0, status: "queued" }]);

      try {
        const originalMimeType = file.type || "application/octet-stream";

        // --- Cifrado cliente-side (opcional) ---
        // Si está activado, ciframos ANTES de pedir la URL de subida: lo
        // que sube al pinning service es ciphertext, nunca el archivo original.
        let bodyToUpload: Blob = file;
        let uploadContentType = originalMimeType;
        let encryptionIv: string | null = null;
        let encryptionKeyBase64: string | null = null;

        if (encrypt) {
          updateTask(taskId, { status: "encrypting" });
          const { ciphertext, key, ivBase64 } = await encryptFile(file);
          bodyToUpload = ciphertext;
          uploadContentType = "application/octet-stream"; // el ciphertext no tiene un mimeType "real"
          encryptionIv = ivBase64;
          encryptionKeyBase64 = await exportKeyToBase64(key);
        }

        updateTask(taskId, { status: "uploading" });

        const tokenRes = await fetch("/api/upload-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: uploadContentType,
            sizeBytes: bodyToUpload.size,
          }),
        });
        const tokenData: RequestUploadUrlResponse = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.uploadUrl) {
          throw new Error(tokenData.error ?? "No se pudo iniciar la subida.");
        }

        await uploadWithProgress(tokenData.uploadUrl, bodyToUpload, uploadContentType, (pct) =>
          updateTask(taskId, { progress: pct })
        );

        updateTask(taskId, { status: "pinning", progress: 100 });

        const result = await finalizeUploadAction({
          key: tokenData.key,
          name: file.name,
          mimeType: originalMimeType, // el mimeType REAL, para poder previsualizar tras descifrar
          sizeBytes: file.size, // tamaño del archivo original, no del ciphertext (mejor UX en la barra de uso)
          folderId,
          tags: [],
          isEncrypted: encrypt,
          encryptionIv,
          encryptionKey: encryptionKeyBase64,
        });

        if (result.error) throw new Error(result.error);

        updateTask(taskId, { status: "done", cid: result.cid });

        // Refresca todo lo que puede haber cambiado tras subir un archivo.
        queryClient.invalidateQueries({ queryKey: folderContentsKey(userId, folderId) });
        queryClient.invalidateQueries({ queryKey: ["my-limits", userId] });
        queryClient.invalidateQueries({ queryKey: ["recent-files", userId] });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido durante la subida.";
        updateTask(taskId, { status: "error", error: message });
        toast.error(`No se pudo subir "${file.name}"`, { description: message });
      }
    },
    [folderId, queryClient, updateTask, userId]
  );

  const uploadFiles = useCallback(
    (files: FileList | File[], options?: { encrypt?: boolean }) => {
      Array.from(files).forEach((file) => void uploadOne(file, options?.encrypt ?? false));
    },
    [uploadOne]
  );

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== "done"));
  }, []);

  return { tasks, uploadFiles, dismissTask, clearFinished };
}
