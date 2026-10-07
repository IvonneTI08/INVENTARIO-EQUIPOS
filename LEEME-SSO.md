# Acceso directo desde IV OS Tecnología → IAFI

Copia el CONTENIDO de esta carpeta sobre la raíz del proyecto (mismas rutas).

| Archivo | Cambio |
|---|---|
| `api/ivos-sso.js` (nuevo) | Recibe el pase de IV OS por POST, lo verifica y abre la sesión de IAFI |
| `lib/ivos-sso.js` (nuevo) | Verifica el pase: firma ES256 de IV OS, `aud = IAF`, 60 s, segundo factor y un solo uso (tabla `ivos_sso_pase`, se crea sola) |
| `index.html` | 1) Se resolvieron 18 conflictos de Git que había sin resolver (se dejó la versión con Google + Neon). 2) Muestra un aviso si el acceso desde IV OS falla |

Las reglas no cambian: la cuenta debe estar en la tabla `usuarios` con estatus Activo, y el rol sale de ahí. El inicio de sesión con Google sigue igual.

## Variable nueva en Vercel (proyecto de IAFI)
- `IVOS_SSO_LLAVE_PUBLICA` = campo `base64` de https://ivos-tecnologia.vercel.app/api/sso/llave (no es secreta). Revisa que el NOMBRE quede exacto.

## Después
1. `git add .` → `git commit` → **`git push`** → pull request a `main` (si aplica).
2. En IV OS: agregar `"IAF":"https://<dirección de IAFI>/api/ivos-sso"` a `SSO_APPS` y hacer Redeploy.
3. Tarjeta en IV OS con Nombre corto `IAF`.
4. Comprobar: abrir `https://<dirección de IAFI>/api/ivos-sso` directo debe regresar a la página principal (no 404).
