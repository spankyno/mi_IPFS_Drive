-- =====================================================================
-- mi_IPFS_Drive — Migración 0002
-- Añade storage_key: la "key" del objeto en el bucket S3-compatible del
-- proveedor de pinning (distinta del CID). La necesitamos para poder
-- borrar/actualizar el objeto original más adelante (DeleteObject,
-- HeadObject, etc). El CID por sí solo no basta para eso.
-- =====================================================================

alter table public.files
  add column if not exists storage_key text;

comment on column public.files.storage_key is
  'Key del objeto en el bucket S3-compatible del proveedor de pinning (ej. Filebase). No confundir con el CID de IPFS.';
