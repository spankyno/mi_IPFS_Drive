-- =====================================================================
-- mi_IPFS_Drive — Migración 0005
-- Sistema de planes: 'registered' (gratis) y 'pro' (19€/año).
--
-- CÓMO SE OTORGA "PRO" (manual, sin pasarela de pago integrada):
-- Simplemente actualiza la columna `plan` del usuario a 'pro' desde el
-- Table Editor de Supabase, o con SQL:
--
--   update public.profiles set plan = 'pro' where email = 'cliente@ejemplo.com';
--
-- En cuanto cambias esa fila, el usuario pasa a tener los límites de Pro
-- en la siguiente petición — no hace falta reiniciar nada ni tocar código.
-- Para revertir a gratis: update ... set plan = 'registered' where ...
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla de definición de planes: los límites viven en una tabla, no
-- hardcodeados en el código, así puedes ajustar cifras (p.ej. subir la
-- cuota de Pro a 10GB el día de mañana) con un simple UPDATE, sin tocar
-- ni redeployar la aplicación.
-- ---------------------------------------------------------------------
create table public.plans (
  id text primary key,                    -- 'registered' | 'pro'
  display_name text not null,
  price_cents_per_year integer not null default 0,
  storage_quota_bytes bigint not null,
  max_files integer not null,
  max_file_size_bytes bigint not null,
  max_active_shares integer not null
);

-- Cualquiera autenticado puede leer la tabla de planes (para mostrar
-- comparativas, "mejora a Pro", etc. en la UI). No hay datos sensibles.
alter table public.plans enable row level security;

create policy "Los planes son legibles por cualquier usuario autenticado"
  on public.plans for select
  to authenticated
  using (true);

insert into public.plans (id, display_name, price_cents_per_year, storage_quota_bytes, max_files, max_file_size_bytes, max_active_shares)
values
  ('registered', 'Registrado', 0, 524288000, 50, 26214400, 3),          -- 500 MB, 50 archivos, 25 MB/archivo, 3 enlaces
  ('pro', 'Pro', 1900, 5368709120, 5000, 524288000, 100)                -- 5 GB, 5000 archivos, 500 MB/archivo, 100 enlaces
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Columna `plan` en profiles — esta es la que tú cambias manualmente.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists plan text not null default 'registered' references public.plans(id);

comment on column public.profiles.plan is
  'Plan del usuario: ''registered'' (gratis) o ''pro'' (19€/año, otorgado manualmente). Cambiar aquí actualiza sus límites al instante.';

-- ---------------------------------------------------------------------
-- storage_quota_bytes en profiles queda obsoleta a favor de la cuota
-- del plan — la dejamos (no la borramos, por si algún registro antiguo
-- la referenciaba) pero de aquí en adelante los límites reales vienen
-- siempre de `plans`, vía la función get_my_limits().
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Función: límites + uso actual del usuario autenticado, en una sola
-- llamada (evita 2 round-trips: uno a `plans`, otro a `storage_usage`).
-- ---------------------------------------------------------------------
create or replace function public.get_my_limits()
returns table (
  plan_id text,
  plan_display_name text,
  storage_quota_bytes bigint,
  max_files integer,
  max_file_size_bytes bigint,
  max_active_shares integer,
  used_bytes bigint,
  file_count bigint,
  active_shares_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      p.id, p.display_name, p.storage_quota_bytes, p.max_files, p.max_file_size_bytes, p.max_active_shares,
      coalesce((select sum(f.size_bytes) from public.files f where f.owner_id = auth.uid()), 0),
      coalesce((select count(*) from public.files f where f.owner_id = auth.uid()), 0),
      coalesce((select count(*) from public.shares s where s.owner_id = auth.uid()), 0)
    from public.profiles pr
    join public.plans p on p.id = pr.plan
    where pr.id = auth.uid();
end;
$$;

grant execute on function public.get_my_limits() to authenticated;
