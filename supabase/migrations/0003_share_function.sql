-- =====================================================================
-- mi_IPFS_Drive — Migración 0003
-- Compartir archivos: función RPC para resolver un enlace privado por
-- token, y corrección de un fallo de seguridad de la migración 0001.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FIX DE SEGURIDAD: la migración 0001 incluía esta política:
--
--   create policy "Cualquiera puede leer un share por token (vía RPC)"
--     on public.shares for select using (true);
--
-- El nombre decía "vía RPC" pero el `using (true)` no filtraba nada:
-- permitía a CUALQUIERA (incluido el rol anónimo) leer la tabla `shares`
-- COMPLETA de TODOS los usuarios con un simple `select * from shares`,
-- exponiendo tokens, owner_id y permisos de enlaces ajenos. La quitamos:
-- el acceso anónimo a un archivo compartido pasa ahora exclusivamente
-- por la función `get_shared_file`, que sí valida el token exacto.
-- ---------------------------------------------------------------------
drop policy if exists "Cualquiera puede leer un share por token (vía RPC)" on public.shares;

-- ---------------------------------------------------------------------
-- Función RPC: dado un token válido y no expirado, devuelve los datos
-- del archivo compartido junto con el permiso concedido (view/download).
-- `security definer` hace que la función se ejecute con privilegios
-- elevados (bypassa RLS), pero solo devuelve la fila que coincide con
-- el token exacto — un visitante anónimo no puede listar ni adivinar
-- otros archivos a través de ella.
-- ---------------------------------------------------------------------
create or replace function public.get_shared_file(p_token text)
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
      f.tags, f.visibility, f.thumbnail_cid, f.created_at, f.updated_at,
      s.permission, s.expires_at
    from public.files f
    join public.shares s on s.file_id = f.id
    where s.share_token = p_token
      and (s.expires_at is null or s.expires_at > now());
end;
$$;

grant execute on function public.get_shared_file(text) to anon, authenticated;
