// Servidor de guardado para el Presupuestador Eléctrico (Cloudflare Worker + KV).
// Guarda el catálogo y los presupuestos en la nube para usarlos desde cualquier dispositivo.
//
// Configuración en el Worker:
//   DATOS            (binding KV)  Espacio de almacenamiento KV. El nombre tiene que ser exactamente DATOS.
//   APP_TOKEN        (secreto)     La clave que inventás. La página la manda en cada consulta.
//   ALLOWED_ORIGINS  (texto)       Sitios que pueden usar el worker, separados por coma.
//                                  Ejemplo: https://tu-usuario.github.io

const KEY = 'estado';
const MAX_BYTES = 2 * 1024 * 1024;

function corsFor(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const open = allowed.length === 0;
  const ok = open || !origin || allowed.includes(origin);
  const headers = { Vary: 'Origin' };
  if (ok && origin) {
    headers['Access-Control-Allow-Origin'] = open ? '*' : origin;
    headers['Access-Control-Allow-Methods'] = 'GET, PUT, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return { ok, headers };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors },
  });
}

// Compara dos textos sin dar pistas por el tiempo que tarda.
export function sameText(a, b) {
  a = String(a);
  b = String(b);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function authorized(request, env) {
  if (!env.APP_TOKEN) return false;
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer (.+)$/.exec(h);
  return !!m && sameText(m[1], env.APP_TOKEN);
}

async function leer(env) {
  const raw = await env.DATOS.get(KEY);
  if (!raw) return { version: 0, updated: null, datos: null };
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { version: 0, updated: null, datos: null };
  }
}

export default {
  async fetch(request, env) {
    const cors = corsFor(request, env);
    if (!cors.ok) return json({ error: 'Este sitio no está permitido en ALLOWED_ORIGINS.' }, 403, cors.headers);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });

    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

    try {
      if (!env.DATOS) return json({ error: 'Falta el espacio KV. Agregalo como binding con el nombre DATOS.' }, 500, cors.headers);
      if (!env.APP_TOKEN) return json({ error: 'Falta el secreto APP_TOKEN en el worker.' }, 500, cors.headers);
      if (!authorized(request, env)) return json({ error: 'Clave incorrecta.' }, 401, cors.headers);

      if (request.method === 'GET' && (path === '/salud' || path === '/')) {
        return json({ ok: true }, 200, cors.headers);
      }

      if (request.method === 'GET' && path === '/datos') {
        return json(await leer(env), 200, cors.headers);
      }

      if (request.method === 'PUT' && path === '/datos') {
        const text = await request.text();
        if (text.length > MAX_BYTES) return json({ error: 'Los datos son demasiado grandes.' }, 413, cors.headers);
        let body;
        try {
          body = JSON.parse(text);
        } catch (e) {
          return json({ error: 'El cuerpo no es JSON válido.' }, 400, cors.headers);
        }
        if (!body || typeof body.datos !== 'object' || body.datos === null || !Number.isInteger(body.base)) {
          return json({ error: 'Faltan datos o la versión base.' }, 400, cors.headers);
        }
        const actual = await leer(env);
        if (actual.version !== body.base) {
          return json({ error: 'Conflicto: los datos cambiaron desde otro lugar.', ...actual }, 409, cors.headers);
        }
        const nuevo = { version: actual.version + 1, updated: new Date().toISOString(), datos: body.datos };
        await env.DATOS.put(KEY, JSON.stringify(nuevo));
        return json({ version: nuevo.version, updated: nuevo.updated }, 200, cors.headers);
      }

      return json({ error: 'Ruta no encontrada.' }, 404, cors.headers);
    } catch (e) {
      return json({ error: e.message || 'Error inesperado.' }, 500, cors.headers);
    }
  },
};
