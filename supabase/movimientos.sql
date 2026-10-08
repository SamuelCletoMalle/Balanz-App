-- Balanz · control de gastos personales
-- Autor: Samuel · © 2026 · Todos los derechos reservados (ver LICENSE)
-- Balanz: alta directa de movimientos desde un Atajo, sin pasar por Pendientes ni abrir la app.
-- Pégalo en Supabase > SQL Editor > Run. Se puede ejecutar varias veces.

-- 1) Lee un texto libre ("Café 3,50", "Ingreso 20 Abuela", un SMS del banco…) y saca importe, concepto, tipo y categoría.
create or replace function public.interpretar_movimiento(p_texto text)
returns table (importe numeric, concepto text, tipo text, categoria text)
language plpgsql
immutable
as $$
declare
  t text := left(coalesce(p_texto, ''), 200);
  m text[];
  c text[];
  num text;
  imp numeric;
  con text := '';
  tip text := 'gasto';
  cat text := 'Otros';
begin
  -- Wallet puede mandar el importe con el símbolo delante ("€12.50"): lo pasamos a "12.50 €".
  t := regexp_replace(t, '€\s*(\d+(?:[.,]\d+)*)', '\1 €', 'g');
  -- Prefiere el número que lleva € / EUR; si no hay, el primer número suelto.
  m := regexp_match(t, '(\d+(?:[.,]\d+)*)\s*(?:€|eur\y|euros?\y)', 'i');
  if m is null then
    m := regexp_match(t, '(?:^|\s)(\d+(?:[.,]\d+)*)(?:\s|$)');
  end if;
  num := m[1];
  if num is not null then
    if num ~ '^\d{1,3}(\.\d{3})+(,\d+)?$' then
      num := replace(replace(num, '.', ''), ',', '.');
    elsif num ~ '^\d{1,3}(,\d{3})+(\.\d+)?$' then
      num := replace(num, ',', '');
    else
      num := replace(num, ',', '.');
    end if;
    begin
      imp := num::numeric;
    exception when others then
      imp := null;
    end;
  end if;

  c := regexp_match(t, 'comercio\s*[:=]\s*(.+)$', 'i');
  if c is not null then
    con := regexp_replace(c[1], '\s+(?:importe|amount|tarjeta|card)\s*[:=].*$', '', 'i');
  else
    c := regexp_match(t, '\y(?:en|at)\s+([^.,;]+)', 'i');
    if c is not null then
      con := regexp_replace(c[1], '\s+(?:con|el|a las|saldo|tarjeta)\y.*$', '', 'i');
    else
      con := regexp_replace(t, '(^|\s)\d+(?:[.,]\d+)*\s*(?:€|eur|euros?)?(?=\s|$)', ' ', 'i');
      con := regexp_replace(con, '\y(?:ingresos?|gastos?)\y[.:]?', '', 'gi');
    end if;
  end if;
  con := left(btrim(regexp_replace(con, '\s+', ' ', 'g'), ' :*-.,;'), 60);
  if con = '' then con := 'Movimiento'; end if;

  if t ~* '\y(ingreso|abono|has recibido|te han (enviado|ingresado)|bizum recibido|recibido|transferencia recibida|devoluci[oó]n|n[oó]mina|reembolso)\y' then
    tip := 'ingreso';
  end if;

  cat := case
    when (con || ' ' || t) ~* 'mercadona|carrefour|lidl|aldi|\ydia\y|eroski|alcampo|consum|supermercado|panader|carnicer|fruter|restaurante|\ybar\y|cafeter|burger|mcdonald|telepizza|glovo|uber eats|just eat|starbucks|caf[eé]|desayuno' then 'Alimentación'
    when (con || ' ' || t) ~* 'gasolin|repsol|cepsa|\ybp\y|shell|galp|renfe|metro|taxi|\yuber\y|cabify|bolt|parking|peaje|\yemt\y|\yave\y|alsa|ryanair|vueling|iberia|blablacar' then 'Transporte'
    when (con || ' ' || t) ~* 'netflix|spotify|hbo|disney|prime video|amazon prime|apple\.com|icloud|youtube|google one|adobe|openai|chatgpt|dazn|suscrip' then 'Suscripciones'
    when (con || ' ' || t) ~* 'farmacia|cl[ií]nica|hospital|dentist|m[eé]dic|optic|sanitas|adeslas|fisio' then 'Salud'
    when (con || ' ' || t) ~* 'cine|teatro|steam|playstation|nintendo|xbox|concierto|ticketmaster|entradas|gym|gimnasio|decathlon|zara|h&m|primark|amazon' then 'Ocio'
    when (con || ' ' || t) ~* 'alquiler|hipoteca|iberdrola|endesa|naturgy|\yagua\y|\yluz\y|\ygas\y|vodafone|movistar|orange|\ydigi\y|ikea|leroy|comunidad|seguro hogar' then 'Vivienda'
    else 'Otros'
  end;

  return query select imp, con, tip, cat;
end;
$$;

-- 2) La que llama el atajo: identifica al usuario por su token y apunta el movimiento directamente.
--    Si no entiende el importe, lo deja en Pendientes para revisarlo a mano.
create or replace function public.registrar_movimiento(p_token text, p_texto text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  r record;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  select user_id into uid from public.captacion_tokens where token = p_token;
  if uid is null then
    raise exception 'token invalido';
  end if;

  select * into r from public.interpretar_movimiento(p_texto);

  if r.importe is null or r.importe <= 0 or r.importe > 1000000 then
    if (select count(*) from public.captaciones where user_id = uid) < 500 then
      insert into public.captaciones (user_id, texto) values (uid, left(p_texto, 1000));
    end if;
    return 'Pendiente: no he podido leer el importe';
  end if;

  insert into public.gastos (id, user_id, descripcion, categoria, importe, fecha, tipo, etiquetas, moneda)
  values (gen_random_uuid(), uid, r.concepto, r.categoria, round(r.importe, 2), hoy, r.tipo, '', 'EUR');

  return case when r.tipo = 'ingreso' then 'Ingreso ' else 'Gasto ' end
    || to_char(round(r.importe, 2), 'FM999999990.00') || ' € · ' || r.concepto;
end;
$$;

revoke all on function public.interpretar_movimiento(text) from public;
revoke all on function public.registrar_movimiento(text, text) from public;
grant execute on function public.registrar_movimiento(text, text) to anon, authenticated;
