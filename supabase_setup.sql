-- =========================================================
-- IAFI · Inventario Activo Fijo Ivonne
-- Script de configuración de base de datos en Supabase
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1. Tabla única tipo "llave-valor" que guarda cada bloque de datos
--    del sistema (inventario, usuarios, bitácora, historial, catálogos)
create table if not exists public.iafi_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Activar seguridad a nivel de fila (obligatorio en Supabase)
alter table public.iafi_kv enable row level security;

-- 3. Políticas de acceso.
--    El sistema IAFI ya tiene su propio login (usuario/contraseña) dentro
--    de la aplicación, así que aquí solo permitimos que la app (usando la
--    llave pública "anon") pueda leer y escribir esta tabla.
--    IMPORTANTE: esto significa que cualquiera que tenga la URL y la
--    "anon key" de tu proyecto podría leer/escribir esta tabla directamente
--    (sin pasar por el login del sistema). Para un sistema interno de bajo
--    riesgo esto es aceptable, pero si más adelante quieres reforzarlo,
--    se puede migrar a Supabase Auth + políticas por usuario.

drop policy if exists "iafi_kv_select_anon" on public.iafi_kv;
create policy "iafi_kv_select_anon" on public.iafi_kv
  for select
  to anon
  using (true);

drop policy if exists "iafi_kv_insert_anon" on public.iafi_kv;
create policy "iafi_kv_insert_anon" on public.iafi_kv
  for insert
  to anon
  with check (true);

drop policy if exists "iafi_kv_update_anon" on public.iafi_kv;
create policy "iafi_kv_update_anon" on public.iafi_kv
  for update
  to anon
  using (true)
  with check (true);

-- Listo. Después de correr este script:
-- 1. Ve a Project Settings > API en Supabase.
-- 2. Copia el "Project URL" y pégalo en SUPABASE_URL dentro del archivo HTML.
-- 3. Copia la "anon public" key y pégala en SUPABASE_ANON_KEY dentro del archivo HTML.
