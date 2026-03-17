-- ─── NUEVAS TABLAS — ejecutar en Supabase SQL Editor ──────

-- Horas trabajadas por servicio dentro de un proyecto
create table if not exists horas (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid references proyectos(id) on delete cascade,
  servicio     text not null, -- 'diseno', 'desarrollo', 'redes', 'ads', 'otro'
  cantidad     numeric(6,2) not null,
  descripcion  text,
  fecha        date default current_date,
  created_at   timestamptz default now()
);

-- Entregables: links a Drive, Figma, etc.
create table if not exists entregables (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid references proyectos(id) on delete cascade,
  titulo       text not null,
  url          text not null,
  tipo         text default 'link', -- 'figma', 'drive', 'notion', 'link'
  created_at   timestamptz default now()
);

-- Token publico para el portal del cliente (1 por proyecto)
alter table proyectos
  add column if not exists token_publico text unique default gen_random_uuid()::text;

-- RLS deshabilitado para demo
alter table horas        disable row level security;
alter table entregables  disable row level security;

-- Vista publica del proyecto para el portal del cliente
-- (sin datos sensibles internos)
create or replace view vista_publica_proyecto as
select
  p.id,
  p.nombre,
  p.descripcion,
  p.estado,
  p.presupuesto,
  p.monto_cobrado,
  p.fecha_inicio,
  p.fecha_entrega,
  p.token_publico,
  c.empresa as cliente_empresa,
  c.nombre  as cliente_nombre
from proyectos p
join clientes c on c.id = p.cliente_id;
