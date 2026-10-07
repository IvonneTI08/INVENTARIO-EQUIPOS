// Verifica el "pase" que firma IV OS Tecnología para el acceso directo (SSO).
// No es una ruta pública: lo usa /api/ivos-sso.
import { importSPKI, jwtVerify } from "jose";
import { sql, emailPermitido } from "./core.js";

const EMISOR = process.env.IVOS_SSO_EMISOR || "https://ivos-tecnologia.vercel.app";
const AUDIENCIA = process.env.IVOS_SSO_AUDIENCIA || "IAF";

export class PaseRechazado extends Error {}

let _llave;
function llavePublica() {
  const v = process.env.IVOS_SSO_LLAVE_PUBLICA;
  if (!v) throw new PaseRechazado("Falta IVOS_SSO_LLAVE_PUBLICA");
  // Acepta el PEM tal cual o en base64 (el campo "base64" de /api/sso/llave de IV OS)
  const pem = v.includes("BEGIN") ? v.replace(/\\n/g, "\n") : Buffer.from(v.trim(), "base64").toString("utf8");
  return (_llave ??= importSPKI(pem, "ES256"));
}

/* Un pase sirve UNA sola vez: su identificador (jti) se guarda al usarlo y un
   segundo intento choca con la llave primaria. La tabla se crea sola. */
let _tabla;
async function quemarPase(jti, email) {
  _tabla ??= sql()`create table if not exists ivos_sso_pase (
      jti text primary key, email text not null, usado_en timestamptz not null default now())`
    .catch((e) => { _tabla = null; throw e; });
  await _tabla;
  const filas = await sql()`
    insert into ivos_sso_pase (jti, email) values (${jti}, ${email})
    on conflict (jti) do nothing returning jti`;
  sql()`delete from ivos_sso_pase where usado_en < now() - interval '1 day'`.catch(() => {});
  return filas.length === 1;
}

export async function verificarPaseIvos(pase) {
  let payload;
  try {
    ({ payload } = await jwtVerify(pase, await llavePublica(), {
      algorithms: ["ES256"], // fijo: evita ataques de "confusión de algoritmo"
      issuer: EMISOR,
      audience: AUDIENCIA,   // un pase para otra app (PPT, CITI…) no sirve aquí
      maxTokenAge: "90s",
      clockTolerance: 10,
    }));
  } catch (e) {
    throw e instanceof PaseRechazado ? e : new PaseRechazado(e.message);
  }
  const email = String(payload.sub || "").toLowerCase();
  if (!emailPermitido(email)) throw new PaseRechazado("dominio no permitido");
  if (payload.mfa !== true || typeof payload.jti !== "string") throw new PaseRechazado("pase incompleto");
  if (!(await quemarPase(payload.jti, email))) throw new PaseRechazado("pase ya usado");
  return { email };
}
