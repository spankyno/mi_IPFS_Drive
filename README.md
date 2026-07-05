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
2. En el SQL Editor del dashboard, ejecuta `supabase/migrations/0001_init.sql`.
3. En **Authentication → Providers**, activa "Email" y asegúrate de que "Confirm email" y "Magic Link" estén habilitados.
4. En **Authentication → URL Configuration**, añade `http://localhost:3000/auth/callback` (y tu dominio de producción) como Redirect URL. Esta misma URL de callback maneja magic links, confirmación de email **y** reset de contraseña.
5. Copia `Project URL` y `anon public key` a tu `.env.local`.

### 3. Elegir un servicio de pinning IPFS
Copia `.env.example` a `.env.local` y define `IPFS_PINNING_PROVIDER` + su API key. Ver comparativa abajo.

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

## 🗺️ Roadmap de implementación (este build es iterativo)

- [x] 1. Estructura base + configuración + README
- [x] 2. Auth: registro, login, magic links, reset de contraseña, middleware de rutas protegidas (**este paso**)
- [ ] 3. Dashboard: stats, storage bar, activity feed
- [ ] 4. Upload flow: drag & drop, carpetas, progreso
- [ ] 5. Previews, búsqueda avanzada, tags
- [ ] 6. Compartir (público/privado) + actividad realtime
- [ ] 7. Optimización, seguridad, pulido UX final

Vamos a construirlo por bloques, confirmando contigo antes de avanzar al siguiente. 👇
