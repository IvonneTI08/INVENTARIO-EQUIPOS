import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  GOOGLE_CLIENT_ID, ALLOWED_DOMAIN, emailPermitido, buscarUsuarioPorEmail,
  crearSesion, registrarEvento, manejarError,
} from "../lib/core.js";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (req.headers["x-iafi"] !== "1") return res.status(403).json({ error: "Petición no permitida." });
  try {
    const credential = req.body && req.body.credential;
    if (!credential) return res.status(400).json({ error: "Falta la credencial de Google." });

    // Verifica la firma de Google, que el token sea para ESTA app y que no haya expirado.
    let payload;
    try {
      ({ payload } = await jwtVerify(credential, GOOGLE_JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: GOOGLE_CLIENT_ID,
      }));
    } catch {
      return res.status(401).json({ error: "No se pudo validar tu cuenta de Google. Intenta de nuevo." });
    }

    const email = String(payload.email || "").toLowerCase();
    if (!payload.email_verified || !emailPermitido(email) || payload.hd !== ALLOWED_DOMAIN) {
      await registrarEvento({ usuario: email || "(desconocido)", tipo: "Intento fallido de inicio de sesión", detalle: "Cuenta fuera del dominio" }).catch(() => {});
      return res.status(403).json({ error: `Solo se permiten cuentas @${ALLOWED_DOMAIN}.` });
    }

    const user = await buscarUsuarioPorEmail(email);
    if (!user || user.estatus !== "Activo") {
      await registrarEvento({ usuario: email, tipo: "Intento fallido de inicio de sesión", detalle: "Cuenta no registrada o inactiva" }).catch(() => {});
      return res.status(403).json({ error: `La cuenta ${email} no está dada de alta o está inactiva en IAFI. Solicita acceso al Admin. Líder.` });
    }

    await crearSesion(res, email);
    await registrarEvento({ usuario: user.usuario, tipo: "Inicio de sesión exitoso", detalle: `Google · ${email} · Rol: ${user.rol}` });
    res.status(200).json({ user });
  } catch (e) { manejarError(res, e); }
}
