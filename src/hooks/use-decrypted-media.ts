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
 * Si el archivo está cifrado, descarga el ciphertext (vía nuestro proxy
 * `/api/ipfs-proxy`, NO directo al gateway — ver comentario en esa ruta
 * sobre por qué: los gateways públicos de IPFS no envían cabeceras CORS,
 * así que un `fetch()` directo desde el navegador falla) y lo descifra
 * localmente con la clave guardada en Supabase, devolviendo una `blob:`
 * URL local (el contenido descifrado nunca se sube a ningún sitio).
 * Si el archivo no está cifrado, devuelve directamente la URL del gateway
 * (las etiquetas <img>/<video>/<iframe> no están sujetas a CORS, así que
 * no hace falta pasar por el proxy en ese caso).
 */
export function useDecryptedMediaUrl(file: DecryptableFile | null, cid: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.filebase.io/ipfs";

  useEffect(() => {
    if (!file || !cid) {
      setUrl(null);
      return;
    }

    if (!file.isEncrypted) {
      setUrl(`${gateway}/${cid}`);
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
        const response = await fetch(`/api/ipfs-proxy?cid=${encodeURIComponent(cid!)}`);
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? `No se pudo descargar el archivo (${response.status}).`);
        }
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
  }, [file?.isEncrypted, file?.encryptionKey, file?.encryptionIv, file?.mimeType, cid, gateway]);

  return { url, isLoading, error };
}
