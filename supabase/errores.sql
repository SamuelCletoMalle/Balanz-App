-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Balanz: avisos de errores de la app. Quien usa la app solo puede AÑADIR avisos; para leerlos, entra al panel de Supabase.
-- Pégalo en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

create table if not exists public.errores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  creado timestamptz not null default now(),
  mensaje text not null,
  pila text not null default '',
  origen text not null default 'app',
  plataforma text not null default '',
  version text not null default ''
);

alter table public.errores enable row level security;

drop policy if exists "errores: añadir propios" on public.errores;
create policy "errores: añadir propios" on public.errores
  for insert to authenticated with check (auth.uid() = user_id);

-- Nadie, salvo el panel de Supabase, puede leerlos ni borrarlos desde la app.
revoke all on public.errores from anon;
revoke all on public.errores from authenticated;
grant insert on public.errores to authenticated;

-- Para verlos: select creado, plataforma, mensaje from public.errores order by creado desc limit 50;
