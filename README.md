# Presupuestador eléctrico

Página para armar presupuestos de instalaciones y reparaciones eléctricas. Cada insumo tiene el precio de la presentación (rollo, caja) y cuántas unidades trae, y la página calcula cuánto cuesta lo que usás.

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | La página. Se publica en GitHub Pages. |
| `worker.js` | Servidor de guardado. Se publica en Cloudflare Workers (gratis). Es opcional: sin él, todo se guarda solo en el navegador. |
| `wrangler.toml` | Configuración, solo si publicás el worker desde la terminal. |

## Publicar la página

1. Creá un repositorio y subí `index.html`.
2. En **Settings**, **Pages**, elegí la rama `main` y la carpeta raíz.

## Guardar en la nube (opcional, gratis)

Sirve para tener el catálogo y los presupuestos en tu compu y en tu celular, y para no perderlos si se borran los datos del navegador.

### 1. Crear el espacio de almacenamiento

1. Entrá a https://dash.cloudflare.com (cuenta gratis).
2. Andá a **Storage & databases**, **KV**, **Create instance** (o **Create namespace**) y ponele de nombre `presupuestador-datos`.

Los nombres de los menús pueden cambiar. Si no encontrás algo, buscá "Workers KV" en la documentación de Cloudflare.

### 2. Publicar el worker

Si ya tenías publicado el worker anterior (el de MercadoLibre), reutilizalo: pegá el código nuevo encima.

1. **Workers & Pages**, **Create**, **Create Worker**, nombre `presupuestador-ml`, **Deploy**.
2. **Edit code**, borrá lo que hay, pegá todo `worker.js` y **Deploy**.
3. En **Settings**, **Bindings**, **Add**, **KV namespace**: nombre de variable `DATOS` (exactamente así) y elegí el espacio que creaste.
4. En **Settings**, **Variables and Secrets**, agregá:
   - `APP_TOKEN`: tipo secreto. Inventá una clave larga (20 caracteres o más, con letras y números). Anotala: la vas a pegar en la página.
   - `ALLOWED_ORIGINS`: tipo texto, la dirección de tu página sin ruta, por ejemplo `https://gomez3.github.io`.
5. Anotá la dirección del worker, algo como `https://presupuestador-ml.tu-usuario.workers.dev`.

Si el worker viejo tenía `ML_CLIENT_ID` y `ML_CLIENT_SECRET`, podés borrarlos.

### 3. Conectar la página

1. Abrí la página, pestaña **Catálogo de precios**, y bajá hasta **Guardar en la nube**.
2. Pegá la dirección del worker y la clave, y tocá **Conectar**.
3. Tiene que decir `Guardado en la nube`.
4. En el celular repetí el paso 3 con la misma dirección y clave. La página te pregunta si cargás lo de la nube.

## Cómo sincroniza

- Cada cambio se sube a los pocos segundos.
- Al abrir la página, o al volver a ella desde otra app, trae lo más nuevo de la nube si vos no tenés cambios sin subir.
- Si cambiaste algo en dos dispositivos sin sincronizar, la página te pregunta qué versión quedarte. No mezcla los datos: gana una de las dos.
- Si no hay internet, los cambios quedan en el navegador y se suben después.

## Copias en la nube

Con la nube conectada, el servidor guarda copias de tus datos. Se ven en **Guardar en la nube**, **Copias en la nube**:

- **Automáticas:** el servidor guarda una copia de lo que va a reemplazar cada 6 horas como máximo, y de inmediato cuando un cambio quita datos (menos precios reales, menos ítems o menos presupuestos). Así, aunque un dispositivo suba datos vacíos o de ejemplo, lo anterior queda guardado.
- **Manuales:** **Guardar copia ahora**.
- **Antes de reemplazar la nube:** si elegís subir los datos de un navegador encima de los de la nube, la página guarda antes lo que había en la nube.
- **Recuperar:** elegí una copia en la lista y tocá **Recuperar esta copia**. Lo que tenías se guarda antes como otra copia.
- Se conservan las últimas 30. Al pasarse, se borran las más viejas. **Borrar esta copia** quita una a mano.

Para usar las copias en la nube tenés que pegar el `worker.js` nuevo en Cloudflare (**Edit code**, borrar todo, pegar, **Deploy**). No hace falta agregar nada más: el binding `DATOS` y las variables siguen igual.

Cada copia es una escritura en KV, y el plan gratuito permite 1.000 por día. Con el uso normal queda muy por debajo. Si pensás guardar copias manuales todo el día, confirmá los límites vigentes en la página de precios de Cloudflare.

## Si se reemplazan tus datos por error

Además de las copias de la nube, la página guarda copias automáticas en el navegador: una al abrirla (cada 12 horas como máximo) y otra antes de cargar datos de la nube o una copia. Al final de la página, en **Copia de seguridad**, elegí una en la lista y tocá **Recuperar esta versión**.

**Al conectar la nube por primera vez, empezá por el dispositivo que tiene tu catálogo real.** Si conectás primero un navegador nuevo, sube los precios de ejemplo a la nube. En el segundo dispositivo, el aviso muestra cuántos ítems tiene cada lado: elegí con cuidado antes de tocar Aceptar.

## Seguridad

- Quien tenga la dirección y la clave puede leer y cambiar tus datos. No las compartas.
- La clave queda guardada en el navegador de cada dispositivo donde la pongas.
- Los datos incluyen los nombres de tus clientes, si los cargás. Si no querés eso en la nube, no cargues el cliente o no uses esta función.
- El servidor no limita los intentos de clave. Por eso conviene una clave larga.

## Límites del plan gratuito de Cloudflare

Workers KV gratis permite 1.000 escrituras y 100.000 lecturas por día, y 1 GB de datos. La página agrupa los cambios en una sola subida cada pocos segundos, así que un uso normal queda muy por debajo. Los límites pueden cambiar: confirmalos en la página de precios de Cloudflare.

## Presupuestos guardados

La pestaña **Guardados** lista todos tus presupuestos. Cuando tocás **Nuevo presupuesto**, el actual queda guardado ahí y empezás uno vacío con el número siguiente.

- **Abrir** trae un presupuesto guardado para verlo o editarlo. El que estabas editando queda guardado.
- **Duplicar** crea un presupuesto nuevo con las mismas líneas, el número siguiente y la fecha de hoy, sin cliente ni obra.
- **×** borra un presupuesto guardado (pide tocar dos veces).
- El buscador filtra por número, cliente u obra.

Los presupuestos guardados van junto con el catálogo en la nube y en la copia de seguridad. El presupuesto de ejemplo que trae la página no se guarda al empezar uno nuevo. Un presupuesto vacío (sin líneas, cliente ni obra) tampoco.

## Copia de seguridad

Además de la nube, en el mismo lugar podés **Descargar copia** (un archivo `.json`) y **Cargar copia**. Conviene bajar una de vez en cuando.

## Límites que conviene conocer

- **No probé el worker contra Cloudflare real.** Lo probé con un KV simulado y dos dispositivos simulados. Si algo falla al conectar, el mensaje de la página dice el motivo.
- KV puede tardar hasta un minuto en reflejar un cambio en otras ubicaciones del mundo. Si sincronizás dos dispositivos con pocos segundos de diferencia, puede aparecer un aviso de conflicto de más.
- Los precios de ejemplo que trae la página son inventados. Reemplazalos por los reales.
