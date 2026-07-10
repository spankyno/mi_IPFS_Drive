"use client";

import { useEffect, useState } from "react";
import { decryptToBlob } from "@/lib/crypto/client-encryption";

interface DecryptableFile {
  isEncrypted: boolean;
  encryptionKey: string | null;
  encryptionIv: string | null;
  mimeType: string;
}

/**
 * Si el archivo está cifrado, descarga el ciphertext desde el gateway y lo
 * descifra en el navegador con la clave guardada en Supabase, devolviendo
 * una blob: URL local (nunca se sube el archivo descifrado a ningún sitio).
 * Si no está cifrado, simplemente devuelve la URL del gateway tal cual.
 */
export function useDecryptedMediaUrl(file: DecryptableFile | null, gatewayUrl: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !gatewayUrl) {
      setUrl(null);
      return;
    }

    if (!file.isEncrypted) {
      setUrl(gatewayUrl);
      return;
    }

    if (!file.encryptionKey || !file.encryptionIv) {
      setError("Este archivo está marcado como cifrado pero falta la clave. No se puede descifrar.");
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(gatewayUrl!);
        if (!response.ok) throw new Error(`El gateway respondió ${response.status}`);
        const ciphertext = await response.arrayBuffer();
        const blob = await decryptToBlob(ciphertext, file!.encryptionKey!, file!.encryptionIv!, file!.mimeType);

        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo descifrar el archivo.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.isEncrypted, file?.encryptionKey, file?.encryptionIv, file?.mimeType, gatewayUrl]);

  return { url, isLoading, error };
}
