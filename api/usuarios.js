import { sql, requerirUsuario, emailPermitido, ROLES, manejarError } from "../lib/core.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const user = await requerirUsuario(req, res);
      if (!user) return;
      const rows = await sql()`select usuario, nombre, rol, email, estatus, photo from usuarios order by nombre`;
      return res.status(200).json({ value: rows });
    }
    if (req.method === "PUT") {
      const user = await requerirUsuario(req, res, { soloLider: true });
      if (!user) return;
      const lista = req.body && req.body.value;
      if (!Array.isArray(lista)) return res.status(400).json({ error: "Lista de usuarios inválida." });

      const limpios = [];
      const vistosU = new Set(), vistosE = new Set();
      for (const u of lista) {
        const usuario = String(u.usuario || "").trim();
        const email = String(u.email || "").trim().toLowerCase();
        if (!usuario || !String(u.nombre || "").trim()) return res.status(400).json({ error: "Cada usuario necesita nombre e identificador." });
        if (!emailPermitido(email)) return res.status(400).json({ error: `El email ${email} no es @ivonne.com.mx.` });
        if (!ROLES.includes(u.rol)) return res.status(400).json({ error: `Rol no válido: ${u.rol}` });
        if (!["Activo", "Inactivo"].includes(u.estatus)) return res.status(400).json({ error: "Estatus no válido." });
        if (vistosU.has(usuario.toLowerCase())) return res.status(400).json({ error: `Usuario repetido: ${usuario}` });
        if (vistosE.has(email)) return res.status(400).json({ error: `Email repetido: ${email}` });
        vistosU.add(usuario.toLowerCase()); vistosE.add(email);
        limpios.push({ usuario, nombre: String(u.nombre).trim(), rol: u.rol, email, estatus: u.estatus, photo: u.photo || null });
      }
      // Evita que el sistema se quede sin nadie que pueda administrar usuarios.
      if (!limpios.some((u) => u.rol === "Admin. Líder" && u.estatus === "Activo")) {
        return res.status(400).json({ error: "Debe quedar al menos un Admin. Líder activo." });
      }
      const db = sql();
      await db.transaction([
        db`delete from usuarios`,
        db`insert into usuarios (usuario, nombre, rol, email, estatus, photo)
           select usuario, nombre, rol, email, estatus, photo
           from jsonb_to_recordset(${JSON.stringify(limpios)}::jsonb)
             as x(usuario text, nombre text, rol text, email text, estatus text, photo text)`,
      ]);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) { manejarError(res, e); }
}
