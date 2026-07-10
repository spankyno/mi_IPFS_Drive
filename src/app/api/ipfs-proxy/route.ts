import { NextResponse, type NextRequest } from "next/server";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.filebase.io/ipfs";

/**
 * Proxy server-side para descargar contenido de un gateway IPFS.
 *
 * Por qué existe: el descifrado cliente-side necesita hacer `fetch()` del
 * ciphertext para pasarlo a `crypto.subtle.decrypt`. Los gateways públicos
 * de IPFS (incluido el de Filebase) no envían cabeceras
 * `Access-Control-Allow-Origin`, así que un fetch directo desde el
 * navegador a esa URL falla con un error de CORS ("Failed to fetch"),
 * aunque la misma URL funcione perfectamente en una etiqueta <img> o
 * <a href> (esas no están sujetas a CORS). Un servidor, en cambio, no
 * tiene esa restricción — así que pedimos el archivo aquí y lo re-servimos
 * desde nuestro propio dominio, con lo que el fetch del navegador es
 * same-origin y no necesita CORS.
 *
 * Solo acepta CIDs (no rutas arbitrarias) para no convertir esto en un
 * proxy HTTP genérico.
 */
export async function GET(request: NextRequest) {
  const cid = request.nextUrl.searchParams.get("cid");

  if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
    return NextResponse.json({ error: "CID inválido." }, { status: 400 });
  }

  try {
    const response = await fetch(`${GATEWAY}/${cid}`);

    if (!response.ok) {
      return NextResponse.json(
        { error: `El gateway respondió ${response.status}.` },
        { status: response.status }
      );
    }

    // Reenviamos el cuerpo tal cual (stream), sin cargarlo entero en memoria.
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error en el proxy de IPFS:", error);
    return NextResponse.json({ error: "No se pudo descargar el archivo desde IPFS." }, { status: 502 });
  }
}
