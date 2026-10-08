/* ==========================================================================
   Base compartida de la demo en Vercel.

   Única pieza de servidor: guarda la base de la demo como un JSON en un
   store PRIVADO de Vercel Blob, para que todas las personas que abren la
   demo publicada vean los mismos tickets. Si el store no está conectado,
   responde 501 y la demo sigue funcionando sólo con el navegador.

   GET /api/db  → { etag, db } (db = null si todavía no hay nada guardado).
                  Con If-None-Match y sin cambios responde 304.
   PUT /api/db  → guarda el cuerpo (la base completa). Usa If-Match con el
                  etag leído para no pisar cambios de otra persona: si la
                  base cambió en el medio responde 412.

   Los datos son ficticios; cualquiera que tenga la dirección de la demo
   puede leerlos y cambiarlos, igual que con la demo misma.
   ========================================================================== */
import { get, head, put, BlobPreconditionFailedError, BlobNotFoundError } from '@vercel/blob';

const RUTA = 'demo/db.json';
const MAX_BYTES = 4 * 1024 * 1024; // las funciones aceptan hasta 4,5 MB por pedido

const CABECERAS = { 'Cache-Control': 'private, no-store', 'X-Demo-Db': '1' };

function json(datos, status) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { ...CABECERAS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Sin store de Blob conectado al proyecto, la demo sigue sólo con el navegador. */
const configurado = () => !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
const sinConfigurar = () => json({ sinConfigurar: true, error: 'No hay un store de Vercel Blob conectado a este proyecto.' }, 501);

/**
 * La lectura del blob devuelve un etag débil (W/"abc") y put/head uno fuerte
 * ("abc"): se comparan sin el prefijo ni las comillas.
 */
const normalizarEtag = (etag) => String(etag || '').replace(/^W\//, '').replace(/"/g, '');

function falla(e) {
  console.error(e);
  return json({ error: 'El almacenamiento de la demo no está disponible.' }, 503);
}

export async function GET(request) {
  if (!configurado()) return sinConfigurar();
  try {
    const r = await get(RUTA, { access: 'private', useCache: false, ifNoneMatch: request.headers.get('if-none-match') || undefined });
    if (!r) return json({ etag: null, db: null }, 200);
    if (r.statusCode === 304) return new Response(null, { status: 304, headers: { ...CABECERAS, ETag: r.blob.etag } });
    const texto = await new Response(r.stream).text();
    // La base ya es JSON: se envuelve sin volver a parsearla.
    return new Response('{"etag":' + JSON.stringify(r.blob.etag) + ',"db":' + texto + '}', {
      status: 200,
      headers: { ...CABECERAS, 'Content-Type': 'application/json; charset=utf-8', ETag: r.blob.etag },
    });
  } catch (e) {
    return falla(e);
  }
}

export async function PUT(request) {
  if (!configurado()) return sinConfigurar();
  const texto = await request.text();
  if (texto.length > MAX_BYTES) return json({ error: 'La base es demasiado grande para guardarla (probá con menos imágenes).' }, 413);
  let db;
  try {
    db = JSON.parse(texto);
  } catch {
    return json({ error: 'El cuerpo no es JSON.' }, 400);
  }
  if (!db || typeof db.version !== 'number' || !Array.isArray(db.tickets)) return json({ error: 'No parece una base de la demo.' }, 400);

  const leido = request.headers.get('if-match');
  let etag = null;
  try {
    if (!leido) {
      // Sin etag sólo se puede crear: si otra persona ya guardó una base, es un conflicto.
      const actual = await get(RUTA, { access: 'private', useCache: false });
      if (actual) {
        if (actual.stream) await actual.stream.cancel();
        return json({ conflicto: true }, 412);
      }
    } else {
      // El etag que tiene el navegador viene de la lectura (formato débil): se compara
      // con el etag real del blob y se usa éste en la escritura condicional.
      let actual;
      try {
        actual = await head(RUTA);
      } catch (e) {
        if (e instanceof BlobNotFoundError) return json({ conflicto: true }, 412);
        throw e;
      }
      if (normalizarEtag(actual.etag) !== normalizarEtag(leido)) return json({ conflicto: true }, 412);
      etag = actual.etag;
    }
    const r = await put(RUTA, texto, {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      ifMatch: etag || undefined,
    });
    return json({ etag: r.etag }, 200);
  } catch (e) {
    if (e instanceof BlobPreconditionFailedError) return json({ conflicto: true }, 412);
    return falla(e);
  }
}
