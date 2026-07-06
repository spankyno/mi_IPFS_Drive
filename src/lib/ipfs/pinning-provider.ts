import "server-only";
import {
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getFilebaseClient, getFilebaseBucket } from "@/lib/ipfs/filebase-client";
import type { PinningProvider } from "@/types/domain";

export interface PinningAdapter {
  /** URL firmada de subida directa (PUT) de corta duración, para que el navegador suba sin pasar por nuestro servidor. */
  getUploadUrl(key: string, contentType: string): Promise<string>;
  /** Tras la subida, recupera el CID de IPFS asignado al objeto. */
  getCid(key: string): Promise<string>;
  /** Borra el objeto (y por tanto lo despinea) del proveedor. */
  deleteObject(key: string): Promise<void>;
  /** URL pública de gateway para previsualizar/descargar por CID. */
  getGatewayUrl(cid: string): string;
}

const UPLOAD_URL_EXPIRY_SECONDS = 300; // 5 minutos — suficiente para iniciar la subida sin dejar URLs firmadas vivas demasiado tiempo

/**
 * Filebase (S3-compatible). Ver README > "Alternativas gratuitas
 * recomendadas" para el resto de proveedores soportables.
 * El CID se recupera vía HeadObject, header `x-amz-meta-cid`
 * (el SDK lo expone ya sin el prefijo, en `Metadata.cid`).
 * Docs: https://filebase.com/docs/ipfs/pinning/pinning-files
 */
class FilebaseAdapter implements PinningAdapter {
  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const client = getFilebaseClient();
    const command = new PutObjectCommand({
      Bucket: getFilebaseBucket(),
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
  }

  async getCid(key: string): Promise<string> {
    const client = getFilebaseClient();
    const result = await client.send(
      new HeadObjectCommand({ Bucket: getFilebaseBucket(), Key: key })
    );
    const cid = result.Metadata?.cid;
    if (!cid) {
      throw new Error(
        `Filebase no devolvió un CID para la key "${key}". El objeto puede seguir pineándose; reintenta en unos segundos.`
      );
    }
    return cid;
  }

  async deleteObject(key: string): Promise<void> {
    const client = getFilebaseClient();
    await client.send(new DeleteObjectCommand({ Bucket: getFilebaseBucket(), Key: key }));
  }

  getGatewayUrl(cid: string): string {
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.io/ipfs";
    return `${gateway}/${cid}`;
  }
}

/**
 * Adaptadores pendientes de implementar. El README documenta cómo son de
 * free tier, pero solo Filebase está cableado por ahora (es el
 * recomendado por defecto). Añadir uno nuevo = implementar PinningAdapter
 * + registrarlo aquí.
 */
class NotImplementedAdapter implements PinningAdapter {
  constructor(private providerName: string) {}
  private fail(): never {
    throw new Error(
      `El proveedor de pinning "${this.providerName}" aún no está implementado en este proyecto. Cambia IPFS_PINNING_PROVIDER a "filebase" o implementa src/lib/ipfs/pinning-provider.ts para este proveedor.`
    );
  }
  async getUploadUrl(): Promise<string> {
    this.fail();
  }
  async getCid(): Promise<string> {
    this.fail();
  }
  async deleteObject(): Promise<void> {
    this.fail();
  }
  getGatewayUrl(): string {
    this.fail();
  }
}

export function getPinningAdapter(): PinningAdapter {
  const provider = (process.env.IPFS_PINNING_PROVIDER || "filebase") as PinningProvider;

  switch (provider) {
    case "filebase":
      return new FilebaseAdapter();
    case "4everland":
    case "ipfs-ninja":
    case "lighthouse":
    case "pinata":
      return new NotImplementedAdapter(provider);
    default:
      return new NotImplementedAdapter(provider);
  }
}
