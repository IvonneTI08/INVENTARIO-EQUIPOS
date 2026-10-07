# IAFI_Inventario_Activo_Fijo_Ivonne
Inventario de los dispositivos de cómputo de Ivonne.

## Cómo funciona
- `index.html`: la aplicación (pantalla de login con Google y todo el sistema).
- `api/`: funciones en Vercel. Validan la cuenta de Google, revisan el rol y son las únicas que se conectan a la base.
- `lib/core.js`: funciones compartidas por la API.
- `db/schema.sql`: crea las tablas en Neon (se ejecuta una sola vez).

Solo entran cuentas **@ivonne.com.mx** que estén dadas de alta y activas en *Usuarios*.

## Variables de entorno en Vercel
| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Se crea sola al conectar Neon desde Vercel → Storage |
| `SESSION_SECRET` | Texto aleatorio de 32+ caracteres (firma las sesiones) |
| `GOOGLE_CLIENT_ID` | Opcional; ya viene en el código |

## Dar acceso a alguien
El Admin. Líder entra a *Usuarios* → *Crear nuevo usuario* con el correo @ivonne.com.mx de la persona.
