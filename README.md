# Presupuestador eléctrico

Página para armar presupuestos de instalaciones y reparaciones eléctricas. Cada insumo tiene el precio de la presentación (rollo, caja) y cuántas unidades trae, y la página calcula cuánto cuesta lo que usás.

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | La página. Se publica en GitHub Pages. |
| `worker.js` | Servidor de guardado. Se publica en Cloudflare Workers (gratis). |
| `wrangler.toml` | Configuración, solo si publicás el worker desde la terminal. |

## Cómo se usa

- Para entrar hay que **iniciar sesión con una cuenta de Google**. Sin eso solo se ve la pantalla de entrada.
- En **Presupuesto**, cada bloque (Datos del trabajo, Materiales, Mano de obra, Ajustes, Totales) se abre y se cierra tocando su título. Cerrado muestra un resumen a la derecha (por ejemplo, el costo de los materiales). La página recuerda cuáles dejaste cerrados.
- **Catálogo de precios**: insumos y mano de obra.
- **Guardados**: todos tus presupuestos.
- **Nube y copias**: guardado en la nube, copias en la nube y copia de seguridad en archivo.

## Puesta en marcha (una sola vez)

### 1. Google: crear el ID de cliente

Es gratis y no pide tarjeta. Los nombres de los menús de Google cambian seguido: si algo no aparece igual, buscá la opción parecida.

1. Entrá a https://console.cloud.google.com con tu cuenta y creá un proyecto (por ejemplo, `Presupuestador`).
2. Abrí **Google Auth Platform** (o **APIs y servicios**, **Pantalla de consentimiento de OAuth**) y completá lo básico: nombre de la app, tu mail de contacto y, en público, **Externo**.
3. En **Clientes**, **Crear cliente**, tipo **Aplicación web**.
4. En **Orígenes autorizados de JavaScript** agregá `https://lucasgomez3.github.io`, sin `/` al final y sin `Presupuestador2`. No hace falta cargar URI de redireccionamiento.
5. **Crear** y copiá el **ID de cliente**: termina en `.apps.googleusercontent.com`.
6. En **Público** (Audience) dejá la app en **Prueba** y, en **Usuarios de prueba**, agregá tu Gmail y el de cada socio que vaya a usarla (hasta 100). **Solo entran esos mails**; cualquier otra cuenta ve "acceso bloqueado". Así no hace falta publicar la app, ni tener política de privacidad pública, ni verificar el sitio con Google. Si algún día querés abrirla a cualquier Gmail, hay que publicarla y completar la verificación de Google, que pide política de privacidad y términos públicos con datos de contacto.

### 2. Cloudflare: actualizar el worker

El espacio KV (`DATOS`) y el worker que ya tenés se reutilizan.

1. Entrá a tu worker, **Edit code**, borrá todo, pegá el `worker.js` nuevo y **Deploy**.
2. En **Settings**, **Variables and Secrets**:
   - Agregá `GOOGLE_CLIENT_ID` (tipo texto) con el ID del paso anterior.
   - `ALLOWED_ORIGINS` queda como está: `https://lucasgomez3.github.io`.
   - `APP_TOKEN` ya no se usa: podés borrarla.
3. **Deploy** otra vez para guardar.

### 3. GitHub: subir la página

1. Abrí `index.html` en un editor de texto y buscá esta línea, cerca del principio del script:
   `var GOOGLE_CLIENT_ID='PEGAR-AQUI-EL-ID-DE-CLIENTE.apps.googleusercontent.com';`
2. Reemplazá el texto entre comillas por tu ID de cliente. La línea de abajo, `WORKER_URL`, ya tiene la dirección de tu worker.
3. Subí el archivo al repositorio `Presupuestador2`, esperá uno o dos minutos y recargá la página sin caché.

## Quién puede entrar

Con la app de Google en **Prueba**, ya entran solo los mails que cargaste como usuarios de prueba. Además, el worker puede limitar todavía más: si agregás la variable `ALLOWED_EMAILS` con una lista de mails separados por coma (por ejemplo `lucas@gmail.com,socio@gmail.com`), solo entran esos. Se cambia desde Cloudflare, sin tocar la página. Si la dejás vacía o no existe, entra cualquier cuenta que Google deje pasar.

Tené en cuenta que todas las cuentas que entran (vos y tus socios) ven **los mismos datos** (el mismo catálogo y los mismos presupuestos, con los nombres de tus clientes). Si no querés eso, cargá `ALLOWED_EMAILS` con tu mail.

## Sesión de Google

- La sesión de Google dura una hora. La página la renueva sola cuando puede. Si no puede (por ejemplo, abriste la página después de un día), vuelve a la pantalla de entrada y tocás el botón de Google.
- **Cerrar sesión** está en **Nube y copias**. Tus datos siguen en este navegador y en la nube.
- Si la sesión vence mientras trabajás, lo que cargaste queda guardado en el navegador y se sube al volver a entrar.
- Entrar con Google protege lo que está en la nube. Los datos que ya están guardados en el navegador de una compu compartida se quedan ahí: en una compu que no es tuya, borrá los datos del sitio al terminar.

## Cómo sincroniza

- Al entrar, la página se conecta sola con la nube.
- Cada cambio se sube a los pocos segundos.
- Al volver a la página desde otra app, trae lo más nuevo de la nube si vos no tenés cambios sin subir.
- Si cambiaste algo en dos dispositivos sin sincronizar, la página te pregunta qué versión quedarte. No mezcla los datos: gana una de las dos.
- Si no hay internet, los cambios quedan en el navegador y se suben después.
- Si la nube está vacía y en este navegador solo hay precios de ejemplo, no se sube nada hasta que cargues tus precios.

**Al entrar por primera vez, empezá por el dispositivo que tiene tu catálogo real.** En el segundo dispositivo, si la nube ya tiene tus precios reales, se cargan solos.

## Copias en la nube

Se ven en **Nube y copias**, **Copias en la nube**:

- **Automáticas:** el servidor guarda una copia de lo que va a reemplazar, como máximo una cada 6 horas. Si un cambio quita datos (menos precios reales, menos ítems o menos presupuestos), guarda una de inmediato, con un mínimo de 10 minutos entre una y otra.
- **Manuales:** **Guardar copia ahora**.
- **Antes de reemplazar la nube:** si elegís subir los datos de un navegador encima de los de la nube, la página guarda antes lo que había en la nube.
- **Recuperar:** elegí una copia y tocá **Recuperar esta copia**. Lo que tenías se guarda antes como otra copia.
- Se conservan las últimas 30. Al pasarse se borran las más viejas, también las manuales. **Borrar esta copia** quita una a mano.

Cada copia es una escritura en KV, y el plan gratuito permite 1.000 por día. Con el uso normal queda muy por debajo. Confirmá los límites vigentes en la página de precios de Cloudflare.

## Si se reemplazan tus datos por error

Además de las copias de la nube, la página guarda copias automáticas en el navegador (una al abrirla, como máximo cada 12 horas, y otra antes de cargar datos de la nube o de un archivo). En **Nube y copias**, **Copia de seguridad**, elegí una y tocá **Recuperar esta versión**.

## Presupuestos guardados

La pestaña **Guardados** lista todos tus presupuestos. Cuando tocás **Nuevo presupuesto**, el actual queda guardado ahí y empezás uno vacío con el número siguiente.

- **Abrir** trae un presupuesto guardado para verlo o editarlo. El que estabas editando queda guardado.
- **Duplicar** crea uno nuevo con las mismas líneas, el número siguiente y la fecha de hoy, sin cliente ni obra.
- **×** borra un presupuesto guardado (pide tocar dos veces).
- El buscador filtra por número, cliente u obra.

## Copia de seguridad en archivo

En **Nube y copias** podés **Descargar copia** (un archivo `.json`) y **Cargar copia**. Conviene bajar una de vez en cuando y guardarla en un lugar aparte.

## Límites que conviene conocer

- **No probé contra Google ni Cloudflare reales.** Probé el worker con tokens de Google firmados de prueba y un KV simulado, y la página en un navegador con un botón de Google simulado. Si algo falla al entrar, el mensaje de la pantalla dice el motivo.
- KV puede tardar hasta un minuto en reflejar un cambio en otras ubicaciones del mundo. Si sincronizás dos dispositivos con pocos segundos de diferencia, puede aparecer un aviso de conflicto de más.
- Los precios de ejemplo que trae la página son inventados. Reemplazalos por los reales.
- Workers KV gratis permite 1.000 escrituras y 100.000 lecturas por día, y 1 GB de datos. Los límites pueden cambiar.
