-- =====================================================================
-- mi_IPFS_Drive — Esquema inicial de base de datos
-- Solo METADATOS se guardan aquí. Los bytes de los archivos viven en IPFS.
-- =====================================================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- PERFILES (extiende auth.users de Supabase)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  storage_quota_bytes bigint not null default 5368709120, -- 5 GB simbólicos (límite "soft" de UI)
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Los usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: crear perfil automáticamente al registrarse
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- FOLDERS (jerarquía simulada vía parent_id, sin límite de profundidad)
-- ---------------------------------------------------------------------
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index folders_owner_idx on public.folders(owner_id);
create index folders_parent_idx on public.folders(parent_id);

alter table public.folders enable row level security;

create policy "CRUD de carpetas propias"
  on public.folders for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- FILES (metadatos; el contenido real está en IPFS identificado por CID)
-- ---------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  cid text not null,                     -- Content Identifier de IPFS
  pinning_provider text not null,        -- 'filebase' | '4everland' | 'ipfs-ninja' | 'lighthouse' | 'pinata'
  is_encrypted boolean not null default false,
  encryption_iv text,                    -- IV base64 si is_encrypted = true (Web Crypto AES-GCM)
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'public', 'unlisted')),
  thumbnail_cid text,                    -- CID opcional de una miniatura pregenerada
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- pg_trgm habilita búsqueda difusa/parcial por nombre (ILIKE '%texto%' con índice)
create extension if not exists pg_trgm;

create index files_owner_idx on public.files(owner_id);
create index files_folder_idx on public.files(folder_id);
create index files_tags_idx on public.files using gin(tags);
create index files_name_trgm_idx on public.files using gin(name gin_trgm_ops);

alter table public.files enable row level security;

create policy "CRUD de archivos propios"
  on public.files for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Lectura pública de archivos compartidos (public/unlisted)"
  on public.files for select
  using (visibility in ('public', 'unlisted'));

-- ---------------------------------------------------------------------
-- SHARES (enlaces de compartición con permisos y expiración)
-- ---------------------------------------------------------------------
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  permission text not null default 'view' check (permission in ('view', 'download')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index shares_token_idx on public.shares(share_token);

alter table public.shares enable row level security;

create policy "El owner gestiona sus shares"
  on public.shares for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Cualquiera puede leer un share por token (vía RPC)"
  on public.shares for select
  using (true);

-- ---------------------------------------------------------------------
-- ACTIVITY LOG (feed de actividad del dashboard)
-- ---------------------------------------------------------------------
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('upload', 'delete', 'share', 'rename', 'move', 'folder_create', 'download')),
  file_id uuid references public.files(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_owner_idx on public.activity_log(owner_id, created_at desc);

alter table public.activity_log enable row level security;

create policy "Lectura de actividad propia"
  on public.activity_log for select
  using (auth.uid() = owner_id);

create policy "Insertar actividad propia"
  on public.activity_log for insert
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------
-- Habilitar Realtime en las tablas relevantes para el feed en vivo
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.activity_log;
alter publication supabase_realtime add table public.files;

-- ---------------------------------------------------------------------
-- Vista de estadísticas de uso (para la barra de progreso del dashboard)
-- ---------------------------------------------------------------------
create view public.storage_usage as
select
  owner_id,
  coalesce(sum(size_bytes), 0) as used_bytes,
  count(*) as file_count
from public.files
group by owner_id;
