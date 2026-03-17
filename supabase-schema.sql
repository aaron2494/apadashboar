-- ─── SCHEMA PARA APA DASHBOARD ───────────────────────────
-- Ejecutar en Supabase → SQL Editor

-- Clientes
create table if not exists clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  empresa     text not null,
  email       text,
  telefono    text,
  notas       text,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- Proyectos
create type estado_proyecto as enum ('EN_PROGRESO','PAUSADO','COMPLETADO','CANCELADO');

create table if not exists proyectos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  descripcion     text,
  cliente_id      uuid references clientes(id) on delete cascade,
  estado          estado_proyecto default 'EN_PROGRESO',
  presupuesto     numeric(12,2) default 0,
  monto_cobrado   numeric(12,2) default 0,
  fecha_inicio    date default current_date,
  fecha_entrega   date,
  created_at      timestamptz default now()
);

-- Pagos
create table if not exists pagos (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid references proyectos(id) on delete cascade,
  monto        numeric(12,2) not null,
  fecha        date default current_date,
  nota         text,
  created_at   timestamptz default now()
);

-- Trigger: actualizar monto_cobrado en proyectos al insertar/borrar pago
create or replace function sync_monto_cobrado()
returns trigger as $$
begin
  update proyectos
  set monto_cobrado = (
    select coalesce(sum(monto), 0) from pagos where proyecto_id = coalesce(new.proyecto_id, old.proyecto_id)
  )
  where id = coalesce(new.proyecto_id, old.proyecto_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_monto on pagos;
create trigger trg_sync_monto
after insert or delete or update on pagos
for each row execute function sync_monto_cobrado();

-- RLS: deshabilitar para demo (en produccion habilitarlo con auth)
alter table clientes   disable row level security;
alter table proyectos  disable row level security;
alter table pagos      disable row level security;

-- Seed data de ejemplo
insert into clientes (nombre, empresa, email, telefono) values
  ('Martin Rossi',    'SalemTech',           'martin@salemtech.io',         '11-4455-6677'),
  ('Lucia Fernandez', 'Tronco Transfers',    'lucia@troncosotransfers.com', '11-2233-4455'),
  ('Diego Saten',     'Saten Clean',         'diego@satenclean.com',        '11-9988-7766'),
  ('Sofia Romero',    'Romero Inmobiliaria', 'sofia@romero.com.ar',         '11-5544-3322');

insert into proyectos (nombre, cliente_id, estado, presupuesto, fecha_entrega) values
  ('Sitio web corporativo', (select id from clientes where empresa='SalemTech'), 'COMPLETADO', 250000, '2024-12-01'),
  ('Landing campaña verano', (select id from clientes where empresa='Tronco Transfers'), 'EN_PROGRESO', 180000, '2025-04-30'),
  ('Rediseno identidad visual', (select id from clientes where empresa='Saten Clean'), 'EN_PROGRESO', 120000, '2025-05-15'),
  ('App mobile MVP', (select id from clientes where empresa='Romero Inmobiliaria'), 'PAUSADO', 400000, '2025-06-30');

insert into pagos (proyecto_id, monto, nota) values
  ((select id from proyectos where nombre='Sitio web corporativo'), 125000, 'Anticipo 50%'),
  ((select id from proyectos where nombre='Sitio web corporativo'), 125000, 'Saldo final'),
  ((select id from proyectos where nombre='Landing campaña verano'), 90000, 'Anticipo'),
  ((select id from proyectos where nombre='Rediseno identidad visual'), 60000, 'Primer cuota');
