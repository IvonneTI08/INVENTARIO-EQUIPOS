import { requerirUsuario, manejarError } from "../lib/core.js";

export default async function handler(req, res) {
  try {
    const user = await requerirUsuario(req, res);
    if (user) res.status(200).json({ user });
  } catch (e) { manejarError(res, e); }
}
