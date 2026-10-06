-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Balanz: perfil de cada usuario (dinero inicial y límite mensual) para no repetir el alta en otro dispositivo.
-- Pégalo en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

create table if not exists public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  fondos text not null default '',
  onboarding boolean not null default false,
  limite numeric,
  actualizado timestamptz not null default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "perfil propio" on public.perfiles;
create policy "perfil propio" on public.perfiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.perfiles from anon;
grant select, insert, update, delete on public.perfiles to authenticated;
