// Utilidades compartidas por las funciones de /api (no es una ruta pública).
import { neon } from "@neondatabase/serverless";
import { SignJWT, jwtVerify } from "jose";

export const ALLOWED_DOMAIN = "ivonne.com.mx";
export const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "1055931084196-p2m8n4hmcov2ln12ppk174g9bmvq4hhl.apps.googleusercontent.com";
export const ROLES = ["Admin. Líder", "Admin. Operativo", "Consulta"];
export const ROLES_ESCRITURA = ["Admin. Líder", "Admin. Operativo"];

const COOKIE = "iafi_session";
const SESSION_HOURS = 10;

let _sql;
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("Falta la variable DATABASE_URL (conecta Neon al proyecto en Vercel).");
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de Vercel.");
  return new TextEncoder().encode(s);
}

export function emailPermitido(email) {
  const parts = String(email || "").trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] === ALLOWED_DOMAIN;
}

export async function crearSesion(res, email) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
  res.setHeader("Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`);
}

export function borrarSesion(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function leerCookie(req) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return null;
}

export async function buscarUsuarioPorEmail(email) {
  const rows = await sql()`
    select usuario, nombre, rol, email, estatus, photo
    from usuarios where lower(email) = lower(${email}) limit 1`;
  return rows[0] || null;
}

// Devuelve el usuario de la sesión (activo y del dominio) o responde 401/403.
export async function requerirUsuario(req, res, { escritura = false, soloLider = false } = {}) {
  // Protección CSRF: las peticiones que modifican datos deben traer este encabezado.
  if (req.method !== "GET" && req.headers["x-iafi"] !== "1") {
    res.status(403).json({ error: "Petición no permitida." });
    return null;
  }
  const token = leerCookie(req);
  if (!token) { res.status(401).json({ error: "Sesión no iniciada." }); return null; }
  let email;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    email = payload.email;
  } catch {
    borrarSesion(res);
    res.status(401).json({ error: "Tu sesión expiró. Vuelve a iniciar sesión." });
    return null;
  }
  const user = emailPermitido(email) ? await buscarUsuarioPorEmail(email) : null;
  if (!user || user.estatus !== "Activo") {
    borrarSesion(res);
    res.status(401).json({ error: "Tu cuenta ya no tiene acceso a IAFI." });
    return null;
  }
  if (soloLider && user.rol !== "Admin. Líder") { res.status(403).json({ error: "Solo el Admin. Líder puede hacer esto." }); return null; }
  if (escritura && !ROLES_ESCRITURA.includes(user.rol)) { res.status(403).json({ error: "Tu perfil es solo de consulta." }); return null; }
  return user;
}

// Fecha y hora de México, generadas en el servidor (no se confía en el reloj del navegador).
export function ahoraMX() {
  const f = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const g = (t) => f.find((p) => p.type === t).value;
  return { fecha: `${g("day")}/${g("month")}/${g("year")}`, hora: `${g("hour")}:${g("minute")}:${g("second")}` };
}

export async function registrarEvento({ usuario, tipo, registro, detalle }) {
  const { fecha, hora } = ahoraMX();
  await sql()`
    insert into bitacora (usuario, fecha, hora, tipo, registro, detalle)
    values (${usuario || "—"}, ${fecha}, ${hora}, ${String(tipo || "").slice(0, 200)},
            ${String(registro || "—").slice(0, 200)}, ${String(detalle || "").slice(0, 2000)})`;
}

export function manejarError(res, e) {
  console.error(e);
  res.status(500).json({ error: e.message || "Error del servidor" });
}
