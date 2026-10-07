// Bloques de datos de la app: inventario, consecutivo, historial de estados y catálogos.
import { sql, requerirUsuario, manejarError } from "../lib/core.js";

const KEYS = ["iafi:inventario", "iafi:seq", "iafi:historial_estados", "iafi:catalogos_extra"];

export default async function handler(req, res) {
  try {
    const key = String((req.query && req.query.key) || "");
    if (!KEYS.includes(key)) return res.status(400).json({ error: "Clave no válida." });

    if (req.method === "GET") {
      const user = await requerirUsuario(req, res);
      if (!user) return;
      const rows = await sql()`select value from kv where key = ${key}`;
      return res.status(200).json({ value: rows.length ? rows[0].value : null });
    }
    if (req.method === "PUT") {
      const user = await requerirUsuario(req, res, { escritura: true });
      if (!user) return;
      const value = req.body ? req.body.value : undefined;
      if (value === undefined) return res.status(400).json({ error: "Falta value." });
      await sql()`
        insert into kv (key, value, updated_at, updated_by)
        values (${key}, ${JSON.stringify(value)}::jsonb, now(), ${user.usuario})
        on conflict (key) do update
          set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) { manejarError(res, e); }
}
