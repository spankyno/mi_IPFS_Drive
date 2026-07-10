-- =====================================================================
-- mi_IPFS_Drive — Migración 0004
-- Cifrado cliente-side real: columna para guardar la clave AES-GCM
-- (en base64) usada para cifrar el archivo en el navegador antes de
-- subirlo. Viaja protegida por las MISMAS políticas RLS que ya protegen
-- la fila de `files` — quien puede leer la fila (owner, o visitante con
-- un enlace de compartición válido vía la función get_shared_file),
-- puede leer también la clave para descifrar. No es zero-knowledge
-- frente a la propia base de datos; sí protege el contenido en la capa
-- de IPFS/pinning. Ver comentarios en src/lib/crypto/client-encryption.ts.
-- =====================================================================

alter table public.files
  add column if not exists encryption_key text;

comment on column public.files.encryption_key is
  'Clave AES-GCM (base64) para descifrar el archivo, si is_encrypted = true. Protegida por las políticas RLS de esta tabla.';

-- ---------------------------------------------------------------------
-- Actualizamos get_shared_file (migración 0003) para que también
-- devuelva encryption_key — si no, un enlace privado a un archivo
-- cifrado sería imposible de descifrar para quien lo recibe.
--
-- Postgres no permite CREATE OR REPLACE cuando cambian las columnas de
-- retorno (el "shape" definido por los OUT params) — hay que borrar la
-- función existente primero. Ver: https://www.postgresql.org/docs/current/sql-createfunction.html
-- ---------------------------------------------------------------------
drop function if exists public.get_shared_file(text);

create function public.get_shared_file(p_token text)
returns table (
  id uuid,
  owner_id uuid,
  folder_id uuid,
  name text,
  mime_type text,
  size_bytes bigint,
  cid text,
  storage_key text,
  pinning_provider text,
  is_encrypted boolean,
  encryption_iv text,
  encryption_key text,
  tags text[],
  visibility text,
  thumbnail_cid text,
  created_at timestamptz,
  updated_at timestamptz,
  share_permission text,
  share_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      f.id, f.owner_id, f.folder_id, f.name, f.mime_type, f.size_bytes,
      f.cid, f.storage_key, f.pinning_provider, f.is_encrypted, f.encryption_iv,
      f.encryption_key, f.tags, f.visibility, f.thumbnail_cid, f.created_at, f.updated_at,
      s.permission, s.expires_at
    from public.files f
    join public.shares s on s.file_id = f.id
    where s.share_token = p_token
      and (s.expires_at is null or s.expires_at > now());
end;
$$;

grant execute on function public.get_shared_file(text) to anon, authenticated;
