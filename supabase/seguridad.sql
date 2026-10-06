-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Balanz: cada usuario solo puede ver y tocar SUS gastos.
-- Pégalo en Supabase > SQL Editor > Run. Se puede ejecutar varias veces sin problema.

alter table public.gastos enable row level security;
alter table public.gastos force row level security;

-- Si la columna no se rellenaba sola, se rellena con el usuario que inserta.
alter table public.gastos alter column user_id set default auth.uid();

drop policy if exists "gastos: ver propios" on public.gastos;
create policy "gastos: ver propios" on public.gastos
  for select using (auth.uid() = user_id);

drop policy if exists "gastos: crear propios" on public.gastos;
create policy "gastos: crear propios" on public.gastos
  for insert with check (auth.uid() = user_id);

drop policy if exists "gastos: editar propios" on public.gastos;
create policy "gastos: editar propios" on public.gastos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gastos: borrar propios" on public.gastos;
create policy "gastos: borrar propios" on public.gastos
  for delete using (auth.uid() = user_id);

-- Un usuario anónimo (sin sesión) no debe poder hacer nada con la tabla.
revoke all on public.gastos from anon;
grant select, insert, update, delete on public.gastos to authenticated;

-- Comprobación: debe devolver una fila por política y rowsecurity = true.
select tablename, rowsecurity from pg_tables where tablename = 'gastos';
select policyname, cmd from pg_policies where tablename = 'gastos' order by cmd;
