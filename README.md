# 🗂️ mi_IPFS_Drive

Almacenamiento de archivos **100% descentralizado** sobre IPFS, con una experiencia de usuario a la altura de Google Drive + Notion. Next.js 15 (App Router, RSC, Server Actions) + React 19 + TypeScript + Tailwind + shadcn/ui en el frontend; Supabase (Postgres + Auth + Realtime) solo para **metadatos** — nunca para los bytes de los archivos.

> **Principio de diseño clave:** la base de datos jamás almacena el contenido de un archivo. Solo guarda su CID (Content Identifier de IPFS), nombre, tags, tamaño, tipo MIME y flags de visibilidad. El archivo en sí vive en la red IPFS, "pineado" (persistido) por un servicio gratuito.

---

## 📁 Estructura del proyecto

```
mi_ipfs_drive/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/              → Formulario email+password / magic link
│   │   │   ├── register/
│   │   │   └── auth/callback/      → Callback de Supabase Auth (magic link, OAuth)
│   │   ├── dashboard/               → Panel protegido (server component + streaming)
│   │   ├── share/[cid]/             → Vista pública de un archivo compartido
│   │   ├── api/upload-token/        → Route handler: emite tokens firmados de subida
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     → Primitivas shadcn/ui (Button, Dialog, Progress...)
│   │   ├── auth/                   → LoginForm, RegisterForm, MagicLinkForm
│   │   ├── dashboard/              → StatsCards, StorageBar, ActivityFeed
│   │   ├── files/                  → FileGrid, FileList, Dropzone, FilePreview, ShareModal
│   │   └── shared/                 → Navbar, Sidebar, ThemeToggle
│   ├── lib/
│   │   ├── supabase/               → clients (browser/server), queries, server actions
│   │   ├── ipfs/                   → helia client, pinning-provider.ts (abstracción multi-proveedor)
│   │   └── utils/                  → formatBytes, cn(), validación zod
│   ├── hooks/                      → useUpload, useFiles (TanStack Query), useRealtimeActivity
│   └── types/                      → domain.ts, database.ts (generado)
├── supabase/
│   └── migrations/0001_init.sql    → Esquema completo con RLS
├── .env.example
└── README.md  (este archivo)
```

---

## 🚀 Puesta en marcha

### 1. Clonar e instalar
```bash
pnpm install   # o npm install / yarn
```

### 2. Supabase (Auth + DB + Realtime)
1. Crea un proyecto gratis en [supabase.com](https://supabase.com) (free tier: 500 MB DB, 50k usuarios activos/mes, Realtime incluido).
2. En el SQL Editor del dashboard, ejecuta `supabase/migrations/0001_init.sql` y luego `supabase/migrations/0002_add_storage_key.sql` (en ese orden).
3. En **Authentication → Providers**, activa "Email" y asegúrate de que "Confirm email" y "Magic Link" estén habilitados.
4. En **Authentication → URL Configuration**, añade `http://localhost:3000/auth/callback` (y tu dominio de producción) como Redirect URL. Esta misma URL de callback maneja magic links, confirmación de email **y** reset de contraseña.
5. Copia `Project URL` y `anon public key` a tu `.env.local`.

### 3. Elegir un servicio de pinning IPFS
Copia `.env.example` a `.env.local` y define `IPFS_PINNING_PROVIDER` + su API key. Ver comparativa abajo.

**Importante — CORS en el bucket de Filebase:** el navegador sube el archivo **directamente** al endpoint S3 de Filebase (no pasa por nuestro servidor), así que el bucket necesita permitir peticiones `PUT` desde tu dominio. En el dashboard de Filebase, entra a tu bucket → **Settings → CORS** (o usa `aws s3api put-bucket-cors` si prefieres CLI) y añade una regla como:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://tu-dominio.vercel.app"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

Sin esto, la subida fallará en el navegador con un error de CORS aunque la URL firmada sea válida.

### 4. Variables de entorno
```bash
cp .env.example .env.local
# Rellena: Supabase URL/keys + credenciales del pinning provider elegido
```

### 5. Levantar en desarrollo
```bash
pnpm dev
```

---

## 📌 Alternativas gratuitas recomendadas (2026)

### IPFS Pinning (persistencia de archivos) — **obligatorio**

Subir un archivo a un nodo IPFS sin "pinearlo" en un servicio persistente significa que puede desaparecer de la red (garbage collection). Por eso necesitamos un pinning service.

| Proveedor | Free tier aprox. | Por qué | Cuándo usarlo |
|---|---|---|---|
| **Filebase** ⭐ recomendado | ~5 GB storage, API S3-compatible | Muy estable, sin tarjeta, ideal para producción pequeña, buenas SLAs | Opción por defecto de este proyecto |
| **4EVERLAND** | ~5 GB, gateway tipo CDN | Rápido, pensado para Web3, buena DX | Si priorizas velocidad de gateway |
| **IPFS Ninja** | Free tier generoso para hobby | Onboarding simple, sin fricción | Prototipos y demos rápidas |
| **Lighthouse.storage** | Tier gratuito + modelo "pay once, store forever" | Persistencia perpetua real (no suscripción) | Si quieres archivos que sobrevivan sin pagos recurrentes |
| **Pinata** | Free limitado (~1 GB / archivos limitados) | Excelente DX y gateway dedicado | MVPs muy pequeños o demos |

El código abstrae el proveedor en `src/lib/ipfs/pinning-provider.ts`. Cambiar de proveedor = cambiar `IPFS_PINNING_PROVIDER` en `.env.local` + sus credenciales. Cada proveedor implementa la misma interfaz `PinningAdapter` (`uploadFile`, `unpin`, `getSignedUploadUrl`), así que el resto de la app no necesita cambios.

**Uploads directos desde el frontend:** cuando el proveedor lo soporta (Filebase vía S3 presigned URLs, Pinata vía JWT temporal), generamos un **token/URL firmado de corta duración** desde una Route Handler (`/api/upload-token`) usando la Service Role Key de Supabase para autenticar al usuario primero. El archivo nunca pasa por nuestro servidor — va directo del navegador al pinning service.

### Auth + Backend + DB + Realtime

| Opción | Free tier | Veredicto |
|---|---|---|
| **Supabase** ⭐ recomendado | 500MB Postgres, 50k MAU, Realtime, Edge Functions, Row Level Security nativo | Todo-en-uno open source, encaja perfecto con Next.js Server Components |
| Clerk | Auth gratis hasta 10k MAU | Excelente si solo necesitas auth (tendrías que sumar una DB aparte, ej. Neon) |

### Hosting

| Opción | Free tier | Veredicto |
|---|---|---|
| **Vercel** ⭐ recomendado | 100 GB bandwidth/mes, deploys ilimitados, Edge Functions | Integración nativa con Next.js (ISR, Server Actions, streaming) |
| Cloudflare Pages | Bandwidth ilimitado | Buena alternativa si ya usas el ecosistema Cloudflare (Workers, R2) |

### Gateways de previsualización

Para mostrar imágenes/PDFs/video directamente en el navegador usamos `https://<gateway>/ipfs/<CID>`. Por defecto usamos el gateway público `ipfs.io`, pero cada proveedor de pinning ofrece su propio gateway dedicado (más rápido, sin rate-limit compartido) — configúralo en `NEXT_PUBLIC_IPFS_GATEWAY_URL`.

---

## 🛡️ Nota de seguridad de dependencias

Este proyecto fija **Next.js 15.5.18** y **React 19.2.6** deliberadamente. Ha habido dos rondas de parches críticos en RSC:

1. **Diciembre 2025** — CVE-2025-55182 "React2Shell" (RCE crítico, CVSS 10.0) + correcciones de seguimiento CVE-2025-55183/55184/67779.
2. **Mayo 2026** — 13 avisos adicionales (bypass de middleware/proxy, DoS incluyendo CVE-2026-23870, SSRF en upgrades de WebSocket, cache poisoning, XSS). Parcheado en Next.js `15.5.18` / `16.2.6` y `react-server-dom-*` `19.2.6`.

**Vercel bloquea el deploy automáticamente** si detecta una versión de Next.js afectada por estos CVEs — si ves el error *"Vulnerable version of Next.js detected"*, comprueba que tu `package.json` tenga exactamente estas versiones. Dado el ritmo de estos parches, antes de cada deploy real merece la pena revisar https://vercel.com/changelog por si hay una versión más nueva.

También fijamos **`@supabase/ssr` en `^0.12.0`**: versiones `0.5.x` (más antiguas) tienen tipos incompatibles con las versiones recientes de `@supabase/supabase-js` (2.9x+), lo que rompe silenciosamente la inferencia de tipos de `.select()` (todo termina tipado como `never`). Si actualizas `@supabase/supabase-js` en el futuro, actualiza `@supabase/ssr` a la última versión en el mismo commit.

## 📊 Dashboard (Paso 3)

- **Server Component** (`/dashboard/page.tsx`) hace todas las queries en paralelo (`Promise.all`) y pasa los datos como `initialData` a los componentes cliente — primer render instantáneo, sin loading spinners iniciales.
- **`StorageUsageBar`**: barra de progreso con la vista SQL `storage_usage`, cambia a rojo y muestra aviso al llegar al 90% de la cuota.
- **`StatsCards`**: archivos, espacio usado, carpetas, enlaces compartidos.
- **`RecentFiles`**: grid de los últimos archivos subidos, con estado vacío accionable.
- **`ActivityFeed`**: se hidrata con datos del servidor y luego se suscribe a `postgres_changes` de Supabase Realtime sobre `activity_log` — cualquier upload/share/delete aparece al instante sin recargar, incluso desde otra pestaña.
- Todos los hooks (`use-storage-usage`, `use-recent-files`, `use-realtime-activity`) usan TanStack Query con `initialData`, así que no hay parpadeo entre el render del servidor y la hidratación del cliente.

## 🔑 Sistema de autenticación (Paso 2)

Implementado con `@supabase/ssr` (cliente browser + server + middleware), Server Actions de React 19 (`useActionState`) y validación con Zod.

**Rutas:**
- `/login` — tabs de **email+password** y **magic link**.
- `/register` — alta con confirmación por email (configurable en Supabase).
- `/forgot-password` → `/update-password` — flujo completo de reset de contraseña.
- `/auth/callback` — Route Handler que canjea el `code` (PKCE) por una sesión, tanto para magic links como para confirmaciones de email y reset de contraseña.
- `/dashboard/*` — protegidas por `middleware.ts` (redirige a `/login?redirectTo=...` si no hay sesión) y de forma redundante en el `layout.tsx` del dashboard (defensa en profundidad).

**Notas de seguridad:**
- El middleware usa `supabase.auth.getUser()` (valida el JWT contra el servidor), nunca `getSession()` a secas, para evitar confiar en una cookie sin verificar.
- Los mensajes de error de login/reset son deliberadamente genéricos ("email o contraseña incorrectos", "si existe una cuenta...") para no filtrar qué emails están registrados.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en `createServiceRoleClient()` (server-only), nunca llega al bundle de cliente.

## 🔒 Seguridad y privacidad

- **Row Level Security** en todas las tablas de Supabase: cada usuario solo puede leer/escribir sus propios registros; los archivos `public`/`unlisted` son legibles por cualquiera (necesario para los enlaces de compartición).
- **Encriptación cliente-side opcional** (`NEXT_PUBLIC_ENABLE_CLIENT_ENCRYPTION=true`): los archivos marcados como privados se cifran con **AES-GCM (Web Crypto API)** en el navegador antes de subir a IPFS. La clave de cifrado nunca viaja al servidor.
- **Enlaces de compartición**: usan un `share_token` aleatorio (no el ID interno), con `permission` (`view`/`download`) y `expires_at` opcional.
- Los CIDs son públicos por naturaleza (cualquiera con el CID puede acceder al contenido en IPFS) — por eso la encriptación cliente-side es la única garantía real de privacidad para archivos sensibles, más allá del control de acceso a nivel de aplicación.

---

## 🧱 Stack técnico

- **Frontend:** Next.js 15 (App Router, Server Components, Server Actions, streaming), React 19, TypeScript estricto.
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives) — accesible por defecto (ARIA, focus management, keyboard nav).
- **Estado servidor:** TanStack Query (cache, invalidación, optimistic updates) + Supabase Realtime (`postgres_changes`) para el feed de actividad en vivo.
- **IPFS:** Helia (sucesor moderno de js-ipfs) en cliente para operaciones locales (hashing, UnixFS) + adaptadores HTTP hacia el pinning service elegido.
- **Validación:** Zod + react-hook-form.

---

## 📤 Upload a IPFS (Paso 4)

**Flujo de subida (subida directa navegador → Filebase, sin pasar por nuestro servidor):**

1. El cliente pide una URL firmada a `POST /api/upload-token` (Route Handler), que primero verifica la sesión con Supabase y luego genera un `PutObjectCommand` firmado (5 min de validez) contra el endpoint S3 de Filebase. La *key* del objeto se genera server-side como `{userId}/{uuid}-{nombre-sanitizado}`.
2. El navegador sube el archivo con `XMLHttpRequest` (no `fetch`) directamente a esa URL — es la única forma de tener eventos de progreso reales (`xhr.upload.onprogress`) en el navegador.
3. Al terminar, el cliente llama al Server Action `finalizeUploadAction`, que hace un `HeadObject` contra Filebase para leer el CID recién asignado (header `x-amz-meta-cid`), inserta la fila en `files` y registra la actividad — todo esto server-side, sin depender de que el navegador pueda leer ese header (Filebase no expone `x-amz-meta-*` a JS de navegador por CORS salvo que lo configures explícitamente).
4. TanStack Query invalida `folder-contents`, `storage-usage` y `recent-files` para reflejar el cambio al instante.

**Carpetas**: jerarquía real vía `parent_id` en Postgres, navegable con breadcrumb (`?folder=<id>` en la URL). **Borrado**: `deleteFileAction` borra primero el objeto en Filebase (`DeleteObjectCommand`, lo despinea de IPFS) y luego la fila en Postgres.

**Nota:** el filtro de este paso es solo por nombre dentro de la carpeta actual. Búsqueda avanzada (por tags, en todo el drive) y la previsualización enriquecida (modal con imagen/video/PDF embebido) llegan en el Paso 5.

## 🔍 Preview, búsqueda y tags (Paso 5)

- **Preview modal**: al hacer clic en un archivo (grid o lista) se abre un modal con vista embebida — `<img>` para imágenes, `<video controls>` para vídeo, `<iframe>` para PDF, y un fallback genérico con enlace a IPFS para el resto de tipos. Desde ahí también puedes renombrar, editar tags, copiar el enlace o eliminar, sin salir del modal.
- **Tags**: editor de chips (`TagInput`) — Enter o coma para añadir, click en la X para quitar. Se guardan con `updateTagsAction` en cuanto cambian, sin botón de "guardar" aparte.
- **Búsqueda avanzada**: en cuanto escribes algo o seleccionas una tag en el filtro, la búsqueda deja de limitarse a la carpeta actual y consulta **todo tu drive** (`searchFiles`, por nombre con `ILIKE` y por tags con el operador `overlaps` de Postgres). Sin texto ni tags activas, el buscador vuelve a filtrar solo dentro de la carpeta actual (más rápido, sin round-trip al servidor).
- **Filtro de tags**: dropdown con todas las tags que has usado alguna vez (`getAllTags`), selección múltiple — se combina con la búsqueda por texto si ambas están activas.

## 🗺️ Roadmap de implementación (este build es iterativo)

- [x] 1. Estructura base + configuración + README
- [x] 2. Auth: registro, login, magic links, reset de contraseña, middleware de rutas protegidas
- [x] 3. Dashboard: stats, storage bar, activity feed en tiempo real
- [x] 4. Upload flow: drag & drop, carpetas, progreso
- [x] 5. Previews, búsqueda avanzada, tags (**este paso**)
- [ ] 6. Compartir (público/privado) + actividad realtime
- [ ] 7. Optimización, seguridad, pulido UX final

Vamos a construirlo por bloques, confirmando contigo antes de avanzar al siguiente. 👇
