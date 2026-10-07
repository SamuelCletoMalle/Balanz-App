-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Balanz: cuentas (efectivo, banco, ahorros), traspasos y ajustes de la cuenta que viajan entre dispositivos.
-- Pégalo en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

-- Cada movimiento sabe de qué cuenta sale o en cuál entra el dinero (los antiguos cuentan como "banco").
alter table public.gastos add column if not exists cuenta text not null default 'banco';

-- Categorías propias y presupuestos por categoría, en el perfil de cada usuario.
alter table public.perfiles add column if not exists ajustes text not null default '';
