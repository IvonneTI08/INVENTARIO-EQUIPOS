-- =========================================================
-- IAFI · Inventario Activo Fijo Ivonne · Base de datos en Neon
-- Ejecutar UNA vez en: Neon > SQL Editor > pegar todo > Run
-- =========================================================

-- Usuarios con acceso. El email debe ser la cuenta de Google @ivonne.com.mx.
create table if not exists usuarios (
  usuario    text primary key,
  nombre     text not null,
  rol        text not null check (rol in ('Admin. Líder','Admin. Operativo','Consulta')),
  email      text not null,
  estatus    text not null default 'Activo' check (estatus in ('Activo','Inactivo')),
  photo      text,
  creado     timestamptz not null default now(),
  constraint usuarios_email_dominio check (lower(email) like '%@ivonne.com.mx')
);
create unique index if not exists usuarios_email_unico on usuarios (lower(email));

-- Bitácora: solo se agregan eventos.
create table if not exists bitacora (
  id        bigserial primary key,
  usuario   text not null,
  fecha     text not null,
  hora      text not null,
  tipo      text not null,
  registro  text not null default '—',
  detalle   text not null default '',
  creado    timestamptz not null default now()
);

-- Bloques de datos de la app (inventario, consecutivo, historial, catálogos).
create table if not exists kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Usuarios iniciales (solo se insertan si no existen).
insert into usuarios (usuario, nombre, rol, email, estatus) values
  ('admin',    'Administrador Líder',  'Admin. Líder',     'jamezquita@ivonne.com.mx', 'Activo'),
  ('aespitia', 'Alberto Espitia',      'Admin. Operativo', 'aespitia@ivonne.com.mx',   'Activo'),
  ('eruiz',    'Eduardo Ruiz',         'Admin. Operativo', 'eruiz@ivonne.com.mx',      'Activo'),
  ('eaguilar', 'Elisa Aguilar',        'Admin. Operativo', 'eaguilar@ivonne.com.mx',   'Activo'),
  ('jalvarez', 'Jose Eduardo Alvarez', 'Admin. Operativo', 'jalvarez@ivonne.com.mx',   'Activo'),
  ('jluna',    'Julio Luna',           'Consulta',         'jluna@ivonne.com.mx',      'Activo')
on conflict (usuario) do nothing;
