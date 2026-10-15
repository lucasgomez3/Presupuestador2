// Servidor intermedio para el Presupuestador Eléctrico.
// Corre como Cloudflare Worker. Guarda las credenciales de MercadoLibre (nunca las ve el navegador),
// busca cada insumo y devuelve un precio de referencia por presentación.
//
// Variables que hay que configurar en el Worker:
//   ML_CLIENT_ID       (secreto)  ID de tu aplicación de MercadoLibre
//   ML_CLIENT_SECRET   (secreto)  Clave secreta de tu aplicación
//   ALLOWED_ORIGINS    (texto)    Sitios que pueden usar el worker, separados por coma.
//                                 Ejemplo: https://tu-usuario.github.io
//                                 Si lo dejás vacío, cualquier sitio puede usarlo.
//   ML_SITE            (texto, opcional) Sitio de MercadoLibre. Por defecto MLA (Argentina).

const API = 'https://api.mercadolibre.com';
const MAX_ITEMS = 40;

let tokenCache = { value: null, exp: 0 };

/* ---------- Utilidades puras (se prueban por separado) ---------- */

const UNIT_ALIASES = {
  m: ['m', 'mt', 'mts', 'metro', 'metros'],
  cm: ['cm', 'cms', 'centimetro', 'centimetros'],
  kg: ['kg', 'kgs', 'kilo', 'kilos'],
  l: ['l', 'lt', 'lts', 'litro', 'litros'],
  u: ['u', 'un', 'uni', 'unid', 'unidad', 'unidades', 'pieza', 'piezas', 'pzs'],
};

function normUnit(unit) {
  const u = String(unit || '').toLowerCase().replace(/[.\s]/g, '');
  for (const key of Object.keys(UNIT_ALIASES)) {
    if (UNIT_ALIASES[key].includes(u)) return key;
  }
  return u;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Devuelve una función que dice si un título menciona la presentación (por ejemplo "100 m" o "x100").
export function sizeMatcher(pack, unit) {
  const p = String(pack).replace(/\./g, '[.,]');
  const aliases = UNIT_ALIASES[normUnit(unit)] || [escapeRe(String(unit || '').toLowerCase())];
  const withUnit = new RegExp('(?<![\\d.,])' + p + '\\s*(?:' + aliases.join('|') + ')(?![a-z0-9])', 'i');
  const withX = new RegExp('(?:^|[^a-z0-9])x\\s*' + p + '(?![\\d.,])', 'i');
  return (title) => withUnit.test(title) || withX.test(title);
}

export function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Toma los resultados de la búsqueda y arma el precio de referencia de una presentación.
export function analizar(results, it) {
  const pack = Number(it.pack) > 0 ? Number(it.pack) : 1;
  let list = (results || []).filter(
    (r) =>
      r &&
      Number(r.price) > 0 &&
      (!r.currency_id || r.currency_id === 'ARS') &&
      (!r.condition || r.condition === 'new')
  );
  const total = list.length;
  if (!total) return { ok: false, error: 'Sin resultados en MercadoLibre' };

  if (pack > 1) {
    const match = sizeMatcher(pack, it.unidad);
    list = list.filter((r) => match(String(r.title || '')));
    if (!list.length) {
      return {
        ok: false,
        error: 'Ninguna de las ' + total + ' publicaciones menciona ' + pack + ' ' + (it.unidad || '') + ' en el título',
      };
    }
  }

  let prices = list.map((r) => Number(r.price)).sort((a, b) => a - b);
  const m0 = quantile(prices, 0.5);
  prices = prices.filter((p) => p >= m0 * 0.4 && p <= m0 * 2.5);

  const n = prices.length;
  const med = quantile(prices, 0.5);
  const spread = (quantile(prices, 0.75) - quantile(prices, 0.25)) / med;
  const confianza = n >= 8 && spread <= 0.5 ? 'alta' : n >= 3 && spread <= 0.9 ? 'media' : 'baja';

  return {
    ok: true,
    n,
    mediana: Math.round(med),
    min: Math.round(prices[0]),
    max: Math.round(prices[n - 1]),
    confianza,
  };
}

/* ---------- Acceso a MercadoLibre ---------- */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let tokenInFlight = null;

// Varias consultas en paralelo comparten una sola petición de token.
function getToken(env, force) {
  if (!force && tokenCache.value && Date.now() < tokenCache.exp) return Promise.resolve(tokenCache.value);
  if (!env.ML_CLIENT_ID || !env.ML_CLIENT_SECRET) return Promise.resolve(null);
  if (!tokenInFlight) {
    tokenInFlight = requestToken(env).finally(() => {
      tokenInFlight = null;
    });
  }
  return tokenInFlight;
}

async function requestToken(env) {
  const res = await fetch(API + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.ML_CLIENT_ID,
      client_secret: env.ML_CLIENT_SECRET,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new HttpError(
      502,
      'MercadoLibre no entregó el token (' + res.status + '): ' + (data.message || data.error || 'revisá ML_CLIENT_ID y ML_CLIENT_SECRET')
    );
  }
  tokenCache = {
    value: data.access_token,
    exp: Date.now() + Math.max(60, (data.expires_in || 21600) - 300) * 1000,
  };
  return tokenCache.value;
}

async function searchML(env, q, retried) {
  const token = await getToken(env, false);
  const params = new URLSearchParams({ q, limit: '50', condition: 'new' });
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API + '/sites/' + (env.ML_SITE || 'MLA') + '/search?' + params.toString(), { headers });
  if (res.status === 401 && token && !retried) {
    tokenCache = { value: null, exp: 0 };
    await getToken(env, true);
    return searchML(env, q, true);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new HttpError(res.status, 'MercadoLibre respondió ' + res.status + (data.message ? ': ' + data.message : ''));
  }
  const data = await res.json();
  return data.results || [];
}

async function consultarItem(env, it) {
  const base = { id: it.id };
  try {
    const q = String(it.query || '').trim().slice(0, 120);
    if (!q) return { ...base, ok: false, error: 'Consulta vacía' };
    const results = await searchML(env, q, false);
    return { ...base, ...analizar(results, it) };
  } catch (e) {
    return { ...base, ok: false, error: e.message, status: e.status || 0 };
  }
}

async function pool(list, size, fn) {
  const out = new Array(list.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, list.length) }, async () => {
    while (next < list.length) {
      const k = next++;
      out[k] = await fn(list[k]);
    }
  });
  await Promise.all(workers);
  return out;
}

/* ---------- Respuestas HTTP ---------- */

function corsFor(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const open = allowed.length === 0;
  const ok = open || !origin || allowed.includes(origin);
  const headers = { Vary: 'Origin' };
  if (ok && origin) {
    headers['Access-Control-Allow-Origin'] = open ? '*' : origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return { ok, headers };
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

export default {
  async fetch(request, env) {
    const cors = corsFor(request, env);
    if (!cors.ok) return json({ error: 'Este sitio no está permitido en ALLOWED_ORIGINS.' }, 403, cors.headers);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });

    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'GET' && (path === '/salud' || path === '/')) {
        const out = { ok: true, credenciales: !!(env.ML_CLIENT_ID && env.ML_CLIENT_SECRET) };
        if (out.credenciales) {
          try {
            await getToken(env, false);
            out.token = 'ok';
          } catch (e) {
            out.token = e.message;
          }
          try {
            await searchML(env, 'cable', false);
            out.busqueda = 'ok';
          } catch (e) {
            out.busqueda = e.message;
          }
        } else {
          try {
            await searchML(env, 'cable', false);
            out.busqueda = 'ok sin credenciales';
          } catch (e) {
            out.busqueda = e.message;
          }
        }
        return json(out, 200, cors.headers);
      }

      if (request.method === 'POST' && path === '/precios') {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return json({ error: 'El cuerpo de la consulta no es JSON válido.' }, 400, cors.headers);
        }
        const items = Array.isArray(body && body.items) ? body.items : null;
        if (!items || !items.length) return json({ error: 'Falta la lista de ítems.' }, 400, cors.headers);
        if (items.length > MAX_ITEMS) {
          return json({ error: 'Máximo ' + MAX_ITEMS + ' ítems por consulta.' }, 400, cors.headers);
        }
        const results = await pool(items, 4, (it) => consultarItem(env, it));
        const out = { results };
        const denied = results.filter((r) => !r.ok && (r.status === 401 || r.status === 403));
        if (denied.length === results.length) {
          out.aviso =
            'MercadoLibre rechazó todas las búsquedas (' +
            denied[0].status +
            '). Puede que tu aplicación no tenga permiso para la búsqueda por texto, o que falten las credenciales.';
        }
        return json(out, 200, cors.headers);
      }

      return json({ error: 'Ruta no encontrada.' }, 404, cors.headers);
    } catch (e) {
      return json({ error: e.message || 'Error inesperado.' }, e.status && e.status >= 400 && e.status < 600 ? e.status : 500, cors.headers);
    }
  },
};
