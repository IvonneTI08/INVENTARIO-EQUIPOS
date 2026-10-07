import { requerirUsuario, borrarSesion, registrarEvento, manejarError } from "../lib/core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const user = await requerirUsuario(req, res);
    if (user) await registrarEvento({ usuario: user.usuario, tipo: "Cierre de sesión" });
    borrarSesion(res);
    if (!res.headersSent) res.status(200).json({ ok: true });
  } catch (e) { manejarError(res, e); }
}
