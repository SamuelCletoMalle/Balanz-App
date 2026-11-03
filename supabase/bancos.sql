-- Nexo Pay · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Conexión con bancos (Open Banking, Enable Banking). Pega este script en Supabase > SQL Editor > Run (una sola vez).
-- Las claves de Enable Banking NO van aquí: viven como secretos de la función `banco` (ver docs/BANCOS.md).

-- 1) Bancos conectados por usuario. Solo se pueden LEER y BORRAR desde la app; las altas las hace la función `banco`.
create table if not exists public.banco_conexiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  banco text not null,
  pais text not null default 'ES',
  cuentas jsonb not null default '[]'::jsonb,
  valido_hasta timestamptz,
  estado text not null default 'activa',
  ultimo_sync timestamptz,
  creado timestamptz not null default now()
);
create index if not exists banco_conexiones_user_idx on public.banco_conexiones (user_id);
alter table public.banco_conexiones enable row level security;

drop policy if exists "conexiones propias: leer" on public.banco_conexiones;
create policy "conexiones propias: leer" on public.banco_conexiones
  for select using (auth.uid() = user_id);
drop policy if exists "conexiones propias: borrar" on public.banco_conexiones;
create policy "conexiones propias: borrar" on public.banco_conexiones
  for delete using (auth.uid() = user_id);

-- 2) Movimientos del banco que ya se han traído (para no repetirlos). Solo la función puede tocarla.
create table if not exists public.banco_vistos (
  user_id uuid not null references auth.users (id) on delete cascade,
  referencia text not null,
  creado timestamptz not null default now(),
  primary key (user_id, referencia)
);
alter table public.banco_vistos enable row level security;

-- 3) Estados de autorización en curso (evita que alguien complete una conexión que no empezó). Solo la función.
create table if not exists public.banco_estados (
  estado text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  banco text not null,
  pais text not null default 'ES',
  creado timestamptz not null default now()
);
alter table public.banco_estados enable row level security;
