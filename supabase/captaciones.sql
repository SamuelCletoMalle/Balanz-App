-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Balanz: captación de gastos desde Atajos de iOS / SMS / notificaciones.
-- Pega este script entero en Supabase > SQL Editor > Run (una sola vez).

-- 1) Token personal por usuario (lo usa el atajo para identificarte sin sesión).
create table if not exists public.captacion_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
);
alter table public.captacion_tokens enable row level security;

drop policy if exists "token propio: leer" on public.captacion_tokens;
create policy "token propio: leer" on public.captacion_tokens
  for select using (auth.uid() = user_id);
drop policy if exists "token propio: crear" on public.captacion_tokens;
create policy "token propio: crear" on public.captacion_tokens
  for insert with check (auth.uid() = user_id);

-- Permite rotar el token si se filtra: se borra la fila y la app crea otro.
drop policy if exists "token propio: borrar" on public.captacion_tokens;
create policy "token propio: borrar" on public.captacion_tokens
  for delete using (auth.uid() = user_id);

-- 2) Bandeja de textos recibidos (la app los lee, los interpreta y los borra de aquí).
create table if not exists public.captaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  texto text not null,
  creado timestamptz not null default now()
);
create index if not exists captaciones_user_idx on public.captaciones (user_id, creado);
alter table public.captaciones enable row level security;

drop policy if exists "captaciones propias" on public.captaciones;
create policy "captaciones propias" on public.captaciones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Función que llama el atajo (solo puede AÑADIR a tu bandeja, nunca leer nada).
create or replace function public.registrar_captacion(p_token text, p_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select user_id into uid from public.captacion_tokens where token = p_token;
  if uid is null then
    raise exception 'token invalido';
  end if;
  -- Tope de la bandeja: si un token se filtrara, no se puede inundar la base de datos.
  if (select count(*) from public.captaciones where user_id = uid) >= 500 then
    raise exception 'bandeja llena';
  end if;
  insert into public.captaciones (user_id, texto) values (uid, left(p_texto, 1000));
end;
$$;

-- 4) Columnas nuevas de la tabla gastos (ingresos, etiquetas, divisas, gastos compartidos).
alter table public.gastos add column if not exists tipo text not null default 'gasto';
alter table public.gastos add column if not exists etiquetas text not null default '';
alter table public.gastos add column if not exists moneda text not null default 'EUR';
alter table public.gastos add column if not exists importe_original numeric;
alter table public.gastos add column if not exists divisiones text not null default '';

revoke all on function public.registrar_captacion(text, text) from public;
grant execute on function public.registrar_captacion(text, text) to anon, authenticated;
