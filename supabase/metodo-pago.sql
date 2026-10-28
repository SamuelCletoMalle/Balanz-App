-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Método de pago y nota en cada movimiento (tarjeta, efectivo, Bizum… y un texto libre).
-- Pégalo en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.
-- Sin esto la app funciona igual, pero el método y la nota solo se guardan en cada dispositivo.

alter table public.gastos add column if not exists metodo text not null default '';
alter table public.gastos add column if not exists nota text not null default '';
