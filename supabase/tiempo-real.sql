-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Sincronización en tiempo real entre dispositivos (web y móvil).
-- Pégalo en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.
-- Sin esto la app sigue sincronizando, pero con un repaso cada 30 segundos en vez de al instante.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gastos') then
    alter publication supabase_realtime add table public.gastos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'perfiles') then
    alter publication supabase_realtime add table public.perfiles;
  end if;
end $$;

-- Para que los borrados también lleguen filtrados por usuario.
alter table public.gastos replica identity full;
alter table public.perfiles replica identity full;
