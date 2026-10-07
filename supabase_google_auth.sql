-- =========================================================
-- IAFI · Migración a login con Google (solo @ivonne.com.mx)
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- Requiere haber corrido antes supabase_setup.sql (crea la tabla iafi_kv).
-- =========================================================

-- 1. Bloquear a nivel de base de datos cualquier cuenta que no sea del dominio.
--    Aunque alguien se salte la pantalla de Google, Supabase no le creará usuario.
--    OJO: aplica a TODO el proyecto de Supabase. Si este proyecto lo usan otras
--    apps con otros dominios, no ejecutes este bloque.
create or replace function public.iafi_bloquear_dominio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(split_part(coalesce(new.email, ''), '@', 2)) <> 'ivonne.com.mx' then
    raise exception 'Solo se permiten cuentas @ivonne.com.mx';
  end if;
  return new;
end;
$$;

drop trigger if exists iafi_bloquear_dominio on auth.users;
create trigger iafi_bloquear_dominio
  before insert on auth.users
  for each row execute function public.iafi_bloquear_dominio();

-- 2. Rol del usuario que hace la petición.
--    Se busca su email (del token de Google) dentro de la lista de usuarios de IAFI.
--    Si no está dado de alta, está Inactivo o no es del dominio, devuelve NULL.
create or replace function public.iafi_rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u->>'rol'
  from (select value from public.iafi_kv where key = 'iafi:usuarios') k,
       jsonb_array_elements(k.value) u
  where lower(u->>'email') = lower(auth.jwt()->>'email')
    and u->>'estatus' = 'Activo'
    and lower(split_part(auth.jwt()->>'email', '@', 2)) = 'ivonne.com.mx'
  limit 1
$$;

-- 3. Quitar el acceso anónimo (antes cualquiera con la anon key podía leer/escribir)
drop policy if exists "iafi_kv_select_anon" on public.iafi_kv;
drop policy if exists "iafi_kv_insert_anon" on public.iafi_kv;
drop policy if exists "iafi_kv_update_anon" on public.iafi_kv;

-- 4. Nuevas políticas para usuarios autenticados con Google
drop policy if exists "iafi_kv_select_auth" on public.iafi_kv;
create policy "iafi_kv_select_auth" on public.iafi_kv
  for select to authenticated
  using (public.iafi_rol_actual() is not null);

-- Escritura:
--   · iafi:usuarios  -> solo Admin. Líder
--   · iafi:bitacora  -> cualquier usuario registrado (para registrar inicios/cierres de sesión)
--   · resto          -> Admin. Líder y Admin. Operativo
drop policy if exists "iafi_kv_insert_auth" on public.iafi_kv;
create policy "iafi_kv_insert_auth" on public.iafi_kv
  for insert to authenticated
  with check (
    case
      when key = 'iafi:usuarios' then public.iafi_rol_actual() = 'Admin. Líder'
      when key = 'iafi:bitacora' then public.iafi_rol_actual() is not null
      else public.iafi_rol_actual() in ('Admin. Líder', 'Admin. Operativo')
    end
  );

drop policy if exists "iafi_kv_update_auth" on public.iafi_kv;
create policy "iafi_kv_update_auth" on public.iafi_kv
  for update to authenticated
  using (public.iafi_rol_actual() is not null)
  with check (
    case
      when key = 'iafi:usuarios' then public.iafi_rol_actual() = 'Admin. Líder'
      when key = 'iafi:bitacora' then public.iafi_rol_actual() is not null
      else public.iafi_rol_actual() in ('Admin. Líder', 'Admin. Operativo')
    end
  );

-- 5. Borrar las contraseñas que quedaron guardadas en la lista de usuarios
update public.iafi_kv
set value = (select coalesce(jsonb_agg(u - 'password'), '[]'::jsonb) from jsonb_array_elements(value) u),
    updated_at = now()
where key = 'iafi:usuarios';

-- 6. Alta inicial de usuarios (solo si la lista todavía no existe).
--    El email debe ser exactamente la cuenta de Google con la que entrarán.
insert into public.iafi_kv (key, value)
values ('iafi:usuarios', '[
  {"usuario":"admin",    "nombre":"Administrador Líder",  "rol":"Admin. Líder",     "email":"jamezquita@ivonne.com.mx", "estatus":"Activo", "photo":null},
  {"usuario":"aespitia", "nombre":"Alberto Espitia",      "rol":"Admin. Operativo", "email":"aespitia@ivonne.com.mx",   "estatus":"Activo", "photo":null},
  {"usuario":"eruiz",    "nombre":"Eduardo Ruiz",         "rol":"Admin. Operativo", "email":"eruiz@ivonne.com.mx",      "estatus":"Activo", "photo":null},
  {"usuario":"eaguilar", "nombre":"Elisa Aguilar",        "rol":"Admin. Operativo", "email":"eaguilar@ivonne.com.mx",   "estatus":"Activo", "photo":null},
  {"usuario":"jalvarez", "nombre":"Jose Eduardo Alvarez", "rol":"Admin. Operativo", "email":"jalvarez@ivonne.com.mx",   "estatus":"Activo", "photo":null},
  {"usuario":"jluna",    "nombre":"Julio Luna",           "rol":"Consulta",         "email":"jluna@ivonne.com.mx",      "estatus":"Activo", "photo":null}
]'::jsonb)
on conflict (key) do nothing;
