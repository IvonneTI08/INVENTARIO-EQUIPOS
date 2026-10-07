// La bitácora solo admite agregar eventos: nadie puede editar ni borrar desde la app.
import { sql, requerirUsuario, registrarEvento, manejarError } from "../lib/core.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const user = await requerirUsuario(req, res);
      if (!user) return;
      const rows = await sql()`
        select 'L' || id as id, usuario, fecha, hora, tipo, registro, detalle
        from bitacora order by id desc limit 5000`;
      return res.status(200).json({ value: rows });
    }
    if (req.method === "POST") {
      const user = await requerirUsuario(req, res);
      if (!user) return;
      const { tipo, registro, detalle } = req.body || {};
      if (!tipo) return res.status(400).json({ error: "Falta tipo." });
      // El usuario se toma de la sesión, no de lo que mande el navegador.
      await registrarEvento({ usuario: user.usuario, tipo, registro, detalle });
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) { manejarError(res, e); }
}
