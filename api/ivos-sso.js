// Acceso directo desde IV OS Tecnología (SSO).
// IV OS manda aquí un formulario POST con el "pase" (JWT firmado por IV OS).
// Va por POST y no en la URL para que no quede en el historial ni en los logs.
// Se aplican las MISMAS reglas que en /api/login: cuenta @ivonne.com.mx, dada
// de alta en la tabla usuarios y con estatus Activo. El rol sale de esa tabla.
import { buscarUsuarioPorEmail, crearSesion, registrarEvento } from "../lib/core.js";
import { verificarPaseIvos, PaseRechazado } from "../lib/ivos-sso.js";

function irA(res, ruta) {
  res.statusCode = 303;
  res.setHeader("Location", ruta);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return irA(res, "/");
  let cuerpo = req.body || {};
  if (typeof cuerpo === "string") cuerpo = Object.fromEntries(new URLSearchParams(cuerpo));
  const pase = String(cuerpo.pase || "");
  if (!pase) return irA(res, "/?error=ivos");

  try {
    const { email } = await verificarPaseIvos(pase);
    const user = await buscarUsuarioPorEmail(email);
    if (!user || user.estatus !== "Activo") {
      await registrarEvento({ usuario: email, tipo: "Intento fallido de inicio de sesión", detalle: "IV OS · Cuenta no registrada o inactiva" }).catch(() => {});
      return irA(res, "/?error=ivos-cuenta");
    }
    await crearSesion(res, email);
    await registrarEvento({ usuario: user.usuario, tipo: "Inicio de sesión exitoso", detalle: `IV OS · ${email} · Rol: ${user.rol}` }).catch(() => {});
    return irA(res, "/");
  } catch (e) {
    if (e instanceof PaseRechazado) console.warn("[ivos-sso] pase rechazado:", e.message);
    else console.error("[ivos-sso] error:", e);
    return irA(res, "/?error=ivos");
  }
}
