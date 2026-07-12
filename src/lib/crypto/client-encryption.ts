/**
 * Cifrado cliente-side con Web Crypto API (AES-256-GCM).
 *
 * MODELO DE SEGURIDAD — leer antes de confiar en esto a ciegas:
 * - El archivo se cifra en el navegador ANTES de subirse. Lo que llega a
 *   IPFS/Filebase es ciphertext puro — ni el pinning service, ni un nodo
 *   IPFS random, ni alguien que solo tenga el CID pueden leer el contenido.
 * - La clave (AES-GCM de 256 bits) se genera por archivo, aleatoria, en el
 *   navegador. Se sube cifrada... NO — en esta implementación la clave se
 *   guarda en Supabase junto al resto de metadatos del archivo, protegida
 *   por las mismas políticas RLS que ya protegen la fila (`files`). Esto
 *   NO es "zero-knowledge": si alguien tuviera acceso directo a tu base de
 *   datos de Supabase con privilegios de servicio, podría leer la clave.
 *   Lo que SÍ garantiza es que el contenido nunca viaja ni se almacena en
 *   claro en la capa de IPFS — que es la parte que de verdad no controlas.
 * - Quien tenga acceso legítimo a la fila del archivo (el owner, o quien
 *   tenga un enlace de compartición válido) recibe también la clave para
 *   poder descifrarlo — es el comportamiento esperado: compartir un
 *   archivo cifrado debe permitir a quien lo recibe verlo.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

/** Genera una clave AES-GCM de 256 bits nueva, aleatoria, para un archivo. */
export async function generateFileKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, ["encrypt", "decrypt"]);
}

/** Exporta una CryptoKey a base64 para poder guardarla como texto en la DB. */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(raw);
}

/** Importa una clave desde su representación base64 guardada en la DB. */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey("raw", raw, ALGORITHM, true, ["encrypt", "decrypt"]);
}

/**
 * Cifra un File completo. Devuelve el ciphertext listo para subir (como
 * Blob, para poder usarlo directamente en el PUT) y el IV en base64
 * (necesario para descifrar — no es secreto, puede guardarse junto al resto de metadatos).
 */
export async function encryptFile(
  file: File
): Promise<{ ciphertext: Blob; key: CryptoKey; ivBase64: string }> {
  const key = await generateFileKey();
  const iv = new Uint8Array(12); // 96 bits, tamaño recomendado para AES-GCM
  crypto.getRandomValues(iv);
  const fileBuffer = await file.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, fileBuffer);

  return {
    ciphertext: new Blob([encrypted], { type: "application/octet-stream" }),
    key,
    ivBase64: arrayBufferToBase64(iv),
  };
}

/** Descifra un ArrayBuffer de ciphertext de vuelta al Blob original (con su mimeType real). */
export async function decryptToBlob(
  ciphertext: ArrayBuffer,
  keyBase64: string,
  ivBase64: string,
  originalMimeType: string
): Promise<Blob> {
  const key = await importKeyFromBase64(keyBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new Blob([decrypted], { type: originalMimeType });
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

/** Devuelve un ArrayBuffer "puro" (no Uint8Array) — es lo que Web Crypto exige de forma inequívoca en TS con lib DOM reciente. */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}
