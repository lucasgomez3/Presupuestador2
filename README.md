# Presupuestador eléctrico con precios de MercadoLibre

Página para armar presupuestos de instalaciones y reparaciones eléctricas. Cada insumo tiene el precio de la presentación (rollo, caja) y cuántas unidades trae, y la página calcula cuánto cuesta lo que usás. Con un botón actualiza los precios desde MercadoLibre.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | La página. Se publica en GitHub Pages. |
| `worker.js` | Servidor intermedio. Se publica en Cloudflare Workers (gratis). Guarda tus credenciales de MercadoLibre y hace las búsquedas. |
| `wrangler.toml` | Configuración opcional, solo si publicás el worker desde la terminal. |

La página no puede hablar directo con MercadoLibre: el navegador no permite guardar credenciales de forma segura y la API exige un token. Por eso existe el worker.

## Instalación

### 1. Crear una aplicación en MercadoLibre

1. Entrá a https://developers.mercadolibre.com.ar con tu cuenta.
2. Creá una aplicación nueva (sección "Mis aplicaciones").
3. Copiá el **Client ID** y la **Clave secreta** (Client Secret).

Los nombres de los menús pueden cambiar. Si no encontrás algo, buscá "crear aplicación" en la documentación del sitio.

### 2. Publicar el worker en Cloudflare

Desde el panel (sin instalar nada):

1. Creá una cuenta gratis en https://dash.cloudflare.com.
2. Andá a **Workers & Pages**, **Create**, **Create Worker**, ponele un nombre (por ejemplo `presupuestador-ml`) y tocá **Deploy**.
3. Tocá **Edit code**, borrá lo que hay, pegá todo el contenido de `worker.js` y tocá **Deploy**.
4. En **Settings**, **Variables and Secrets**, agregá:
   - `ML_CLIENT_ID`: tipo secreto, con tu Client ID.
   - `ML_CLIENT_SECRET`: tipo secreto, con tu clave secreta.
   - `ALLOWED_ORIGINS`: tipo texto, con la dirección de tu página sin la ruta, por ejemplo `https://tu-usuario.github.io`. Si lo dejás vacío, cualquier sitio puede usar tu worker.
5. Anotá la dirección del worker, algo como `https://presupuestador-ml.tu-usuario.workers.dev`.

Desde la terminal, en esta carpeta:

```
npx wrangler deploy
npx wrangler secret put ML_CLIENT_ID
npx wrangler secret put ML_CLIENT_SECRET
```

La variable `ALLOWED_ORIGINS` se agrega en el panel o en `wrangler.toml` bajo `[vars]`.

### 3. Publicar la página en GitHub Pages

1. Creá un repositorio y subí `index.html`.
2. En **Settings**, **Pages**, elegí la rama `main` y la carpeta raíz.
3. Abrí la dirección que te da GitHub.

### 4. Conectar la página con el worker

1. En la página, abrí la pestaña **Catálogo de precios**.
2. Desplegá **Conexión con MercadoLibre** y pegá la dirección del worker.
3. Tocá **Probar conexión**. Tiene que decir `Token de MercadoLibre: ok` y `Búsqueda en MercadoLibre: ok`.

Si la búsqueda dice `403`, tu aplicación no tiene permiso para buscar por texto. MercadoLibre restringió su API pública en 2025 y no pude confirmar qué exige hoy la búsqueda. En ese caso el botón no va a poder traer precios, y conviene revisar la documentación de MercadoLibre o escribirles desde el panel de tu aplicación.

## Cómo se usa

- **Actualizar todos desde MercadoLibre** (pestaña Catálogo): busca todos los insumos.
- **Precio ML** en una fila: busca solo ese insumo.
- **Actualizar precios desde MercadoLibre** (pestaña Presupuesto, panel Materiales): busca los insumos que usa el presupuesto actual y actualiza las líneas.

Después de cada actualización, la página muestra cuántos precios cambió y cuáles no pudo actualizar.

## Cómo se calcula el precio

1. Para cada insumo busca `nombre + presentación`, por ejemplo `Cable unipolar 2,5 mm² 100 m`.
2. Si la presentación trae más de una unidad, se queda solo con las publicaciones que mencionan ese tamaño en el título (`100 m`, `100mts`, `x100`). Así no mezcla un rollo de 100 m con uno de 10 m.
3. Descarta publicaciones usadas, en otra moneda y precios muy fuera de lo normal.
4. Usa la **mediana** de lo que queda y la guarda como precio de la presentación, con la fecha, la cantidad de publicaciones y el rango de precios.
5. Marca "mucha variación, revisalo" cuando hay pocas publicaciones o precios muy dispares.

Si ninguna publicación menciona el tamaño en el título, el ítem no se actualiza y la página lo informa. Cargá ese precio a mano con el botón **ML ↗**.

Con eso, 10 m de un rollo de 100 m que cuesta $120.000 se calculan como $12.000. En Ajustes podés elegir contar solo lo que usás o las presentaciones enteras que comprás.

## Límites que conviene conocer

- **No probé el worker contra MercadoLibre real.** Lo probé con respuestas simuladas, y la página de punta a punta contra ese mismo simulador. Si MercadoLibre cambió el formato de sus respuestas o de su autenticación, puede haber que ajustarlo.
- **Los datos se guardan solo en el navegador** donde usás la página. No se sincronizan entre dispositivos, y si borrás los datos del sitio se pierde el catálogo.
- El worker acepta hasta 40 ítems por consulta, y la página los manda de a 15.
- Los precios de ejemplo que trae la página son inventados. Reemplazalos por los reales.
