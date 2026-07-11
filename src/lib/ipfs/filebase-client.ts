import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cliente S3 apuntando al endpoint S3-compatible de Filebase.
 * `forcePathStyle: true` es necesario para endpoints S3-compatibles que no
 * son AWS (si no, el SDK intenta resolver `bucket.s3.filebase.com`, que no
 * existe). Server-only: nunca debe llegar al bundle de cliente, por eso
 * usamos las credenciales secretas (no NEXT_PUBLIC_*).
 */
export function getFilebaseClient() {
  const accessKeyId = process.env.FILEBASE_ACCESS_KEY;
  const secretAccessKey = process.env.FILEBASE_SECRET_KEY;
  const endpoint = process.env.FILEBASE_ENDPOINT ?? "https://s3.filebase.com";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Faltan las credenciales de Filebase (FILEBASE_ACCESS_KEY / FILEBASE_SECRET_KEY) en las variables de entorno."
    );
  }

  return new S3Client({
    endpoint,
    region: "us-east-1", // Filebase usa esta región fija independientemente de tu ubicación real
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getFilebaseBucket(): string {
  const bucket = process.env.FILEBASE_BUCKET;
  if (!bucket) {
    throw new Error("Falta FILEBASE_BUCKET en las variables de entorno.");
  }
  return bucket;
}
