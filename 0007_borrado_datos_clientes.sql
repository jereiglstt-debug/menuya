-- 0007: los datos personales de los clientes (nombre, teléfono, dirección y
-- aclaraciones) se borran a los 90 días. Se conservan productos, cantidades,
-- totales, mesa, medio de pago y fechas, así que las estadísticas no cambian.
-- No toca ninguna otra tabla.

alter table public.orders add column personal_data_purged_at timestamptz;

create or replace function public.purge_customer_data(p_days integer default 90)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare v_n integer;
begin
  if p_days is null or p_days < 30 then
    raise exception 'El plazo mínimo es de 30 días.' using errcode = 'P0001';
  end if;
  update public.orders
     set customer_name = '', customer_phone = '', address = '', note = '',
         personal_data_purged_at = now()
   where created_at < now() - make_interval(days => p_days)
     and personal_data_purged_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.purge_customer_data(integer) from public, anon, authenticated;

-- Tarea diaria con pg_cron (disponible en Supabase). Si la extensión no se
-- puede activar desde SQL, el aviso lo indica: activala en Database →
-- Extensions → pg_cron y volvé a correr SOLO el bloque de abajo.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('purge_customer_data') from cron.job where jobname = 'purge_customer_data';
  perform cron.schedule('purge_customer_data', '15 6 * * *', 'select public.purge_customer_data(90)');
exception when others then
  raise notice 'No se pudo programar la tarea diaria (%). Activá pg_cron y programá: select cron.schedule(''purge_customer_data'', ''15 6 * * *'', ''select public.purge_customer_data(90)'');', sqlerrm;
end $$;
