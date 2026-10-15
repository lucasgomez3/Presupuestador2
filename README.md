# Presupuestador eléctrico

Página para armar presupuestos de instalaciones y reparaciones eléctricas. Cada insumo tiene el precio de la presentación (rollo, caja) y cuántas unidades trae, y la página calcula cuánto cuesta lo que usás.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `index.html` | La página. Se publica en GitHub Pages. |

Ya no hacen falta `worker.js` ni `wrangler.toml`: se pueden borrar del repositorio, y también el worker de Cloudflare si lo habías publicado.

## Publicar

1. Creá un repositorio y subí `index.html`.
2. En **Settings**, **Pages**, elegí la rama `main` y la carpeta raíz.
3. Abrí la dirección que te da GitHub.

## Cómo se usan los precios

Cada ítem del catálogo (y cada material del presupuesto) tiene dos botones, **ML ↗** y **Google ↗**. Abren la búsqueda en una ventana angosta pegada a la derecha de la pantalla, siempre la misma. Mirás los precios ahí y los escribís en la página.

- El navegador puede pedir permiso para ventanas emergentes la primera vez. Aceptalo para este sitio.
- Si el navegador bloquea la ventana, el botón abre una pestaña normal.
- Con Ctrl o Cmd apretado, el botón abre una pestaña nueva en vez de la ventana lateral.
- Google Shopping no siempre muestra fichas con precio. Depende de lo que Google tenga para esa búsqueda.

## Copia de seguridad

Los datos se guardan solo en el navegador donde usás la página. En la pestaña **Catálogo de precios**, abajo:

- **Descargar copia** baja un archivo `.json` con el catálogo y el presupuesto.
- **Cargar copia** reemplaza lo que hay por el contenido del archivo (pide confirmación).

Conviene bajar una copia de vez en cuando, y antes de borrar datos del navegador o cambiar de compu.

## Cómo se calcula

Con el precio de la presentación y cuántas unidades trae, 10 m de un rollo de 100 m que cuesta $120.000 se calculan como $12.000. En Ajustes podés elegir contar solo lo que usás o las presentaciones enteras que comprás.

Los precios de ejemplo que trae la página son inventados. Reemplazalos por los reales.
