-- ─── NUEVAS TABLAS — ejecutar en Supabase SQL Editor ───────

-- Entregables: links a archivos externos por proyecto
create table if not exists entregables (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid references proyectos(id) on delete cascade,
  nombre       text not null,
  url          text not null,
  tipo         text default 'link',  -- 'figma','drive','notion','github','link'
  created_at   timestamptz default now()
);

-- Horas trabajadas por categoria
create table if not exists horas (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid references proyectos(id) on delete cascade,
  categoria    text not null,  -- 'diseno','desarrollo','redes','ads','reunion','otro'
  cantidad     numeric(6,2) not null,
  descripcion  text,
  fecha        date default current_date,
  created_at   timestamptz default now()
);

-- Token publico por proyecto (para portal del cliente)
alter table proyectos
  add column if not exists token_publico text unique
    default encode(gen_random_bytes(16), 'hex');

-- Campos extra en proyectos
alter table proyectos add column if not exists items_presupuesto jsonb default '[]';
-- items_presupuesto: [{ descripcion, cantidad, precio_unitario }]

-- RLS deshabilitado para demo
alter table entregables disable row level security;
alter table horas       disable row level security;

-- Seed: entregables de ejemplo
insert into entregables (proyecto_id, nombre, url, tipo)
select id, 'Diseño en Figma', 'https://figma.com/ejemplo', 'figma'
from proyectos limit 1;

insert into entregables (proyecto_id, nombre, url, tipo)
select id, 'Contenido en Drive', 'https://drive.google.com/ejemplo', 'drive'
from proyectos limit 1;

-- Seed: horas de ejemplo
insert into horas (proyecto_id, categoria, cantidad, descripcion)
select id, 'diseno', 12, 'Wireframes y prototipo'
from proyectos limit 1;

insert into horas (proyecto_id, categoria, cantidad, descripcion)
select id, 'desarrollo', 20, 'Implementacion frontend'
from proyectos limit 1;
