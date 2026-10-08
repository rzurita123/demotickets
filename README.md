# Sistema de tickets ORMEN · Demo navegable

Demo de frontend del sistema de tickets de Mesa de ayuda de ORMEN (Proyecto Integrador, Universidad ORT Uruguay). Simula el sistema completo con datos ficticios para mostrarlo al equipo y a ORMEN, y para ir ajustándolo a partir de lo que respondan.

- Sin dependencias en el navegador: HTML, CSS y JavaScript propios. No usa frameworks, CDN ni paso de compilación.
- Abierta con doble clic o con un servidor local, los datos viven en el navegador de cada persona (`localStorage`).
- Publicada en Vercel con un store de **Vercel Blob** conectado, la base es **compartida**: todas las personas ven los mismos tickets (ver [Base compartida en Vercel](#base-compartida-en-vercel)). Es la única pieza de servidor: `api/db.js`.

## Cómo abrirla

**Con doble clic:** abrí `index.html` en Chrome, Edge, Firefox o Safari. Funciona sin servidor.

**Con un servidor local (opcional):** desde esta carpeta,

```bash
python3 -m http.server 8000
```

y entrá a http://localhost:8000.

## Usuarios de prueba

En la pantalla de ingreso hay un acceso rápido por rol. Todos usan la contraseña `demo`.

| Usuario | Rol | Para mostrar |
|---|---|---|
| `vpereira` | Operadora de Mesa de ayuda | Crear y atender tickets, elevar y bloquear, sugerencias, cierre con solución, proponer soluciones, borradores |
| `scabrera` | Administradora | Revisar y aprobar borradores de solución, estadísticas, usuarios, localidades, catálogos, auditoría |
| `mtechera` | Cliente de Pando | Crear tickets y ver los de su localidad |
| `lgomez` | Cliente de Lagomar | Comprobar que no ve los tickets de Pando |

Para mostrarlo de a dos, abrí otra pestaña con otro usuario: las pestañas comparten los datos y se actualizan solas.

## Publicarla en Vercel

No hace falta compilar nada: Vercel la sirve como sitio estático. Las rutas usan `#/`, así que no hacen falta reglas de redirección.

**Desde un repositorio de GitHub** (cuando exista):

1. Subí esta carpeta al repositorio, por ejemplo como `demo/`.
2. En Vercel: *Add New… → Project* e importá el repositorio.
3. *Framework Preset*: **Other**. *Root Directory*: la carpeta de la demo (por ejemplo `demo`).
4. Dejá vacíos el comando de build y el directorio de salida, y apretá *Deploy*. Vercel instala solo la dependencia de `api/db.js` (`@vercel/blob`, en `package.json`).

Cada cambio que se suba al repositorio genera una nueva versión publicada.

**Desde la terminal, sin repositorio:** con la CLI de Vercel instalada (`npm i -g vercel`), ejecutá `vercel` dentro de esta carpeta y respondé las preguntas (sin build). `vercel --prod` publica la versión definitiva.

La dirección que da Vercel la puede abrir cualquiera que la tenga. La página les pide a los buscadores que no la indexen (`noindex`) y los datos son ficticios.

## Base compartida en Vercel

Un sitio estático no puede escribir archivos en Vercel, así que la base compartida es un JSON (`demo/db.json`) en un store **privado** de Vercel Blob, que lee y escribe la función `api/db.js`. Para activarla (una sola vez):

1. En el proyecto de Vercel: *Storage → Create → Blob*, con acceso **Private**.
2. Conectá el store al proyecto (*Connect to Project*, entornos Production y Preview). Vercel agrega solo las variables (`BLOB_STORE_ID` y el token OIDC).
3. Volvé a publicar (*Redeploy*). La franja amarilla de la demo pasa a decir «Base compartida: todos ven los mismos datos».

Cómo funciona:

- La primera persona que abre la demo publicada sube su base (los datos de ejemplo). Desde ahí, todos leen y escriben esa.
- Los cambios se suben agrupados, un segundo después de la última acción. La base se vuelve a leer al abrir la demo y al volver a la pestaña; no hay consultas periódicas.
- Si dos personas guardan a la vez, gana la que guardó primero: la otra ve un aviso, se le carga la última versión y tiene que repetir su último cambio.
- **Restablecer datos de la demo** vuelve a los datos de ejemplo **para todos**. Subir `VERSION` en `js/data/semilla.js` también reemplaza la base compartida con la nueva semilla.
- Si el store no está conectado, o se abre la demo sin servidor, todo sigue funcionando como antes, sólo en el navegador.
- Plan gratuito (Hobby) de Vercel Blob: 2.000 escrituras y 10.000 lecturas por mes. Si se pasa el límite, Blob queda bloqueado hasta que pasen 30 días y la demo vuelve a guardar sólo en el navegador. Alcanza para mostrarla al equipo y a ORMEN; no para uso intensivo.
- Cada pedido acepta hasta 4 MB: con muchas imágenes pegadas la base puede no entrar.

## Datos

- La primera vez que se abre, la demo genera unos 160 tickets de ejemplo en 11 localidades, con fechas relativas a ese momento.
- Sin base compartida, cada persona tiene su propia copia en su navegador. Con la base compartida de Vercel, todos ven la misma.
- **Restablecer datos de la demo**, en el menú del usuario, vuelve a los datos de ejemplo (con la base compartida, para todos).
- Los correos no se envían: quedan en **Correos simulados**.

## Cómo modificarla

| Qué cambiar | Dónde |
|---|---|
| Colores y tipografía | Variables al principio de `css/styles.css` (paleta ORMEN) |
| Localidades, sistemas, subsistemas, tipos, criticidades, grupos de soporte, usuarios y puntajes iniciales | `js/data/catalogos.js` |
| Tickets y soluciones de ejemplo | `js/data/semilla.js` |
| Reglas: estados, elevación, validaciones, visibilidad, correos, auditoría; sincronización con la base compartida | `js/store.js` |
| Guardado de la base compartida en Vercel Blob | `api/db.js` |
| Permisos por rol | `js/auth.js` |
| Cálculo de las sugerencias de solución | `js/sugerencias.js` |
| Pantallas (una por archivo) | `js/views/` |
| Rutas y qué rol ve cada pantalla | `js/app.js` |

Después de cambiar `catalogos.js` o `semilla.js`, subí el número de `VERSION` en `js/data/semilla.js`: así cada navegador descarta los datos viejos y genera los nuevos. Otra opción es usar *Restablecer datos de la demo*.

Para agregar una pantalla: creá `js/views/mi-pantalla.js`, sumalo en `index.html` antes de `js/app.js` y registrá la ruta en `js/app.js`.

## Estructura

```
index.html          punto de entrada y orden de los scripts
css/styles.css      estilos (escritorio y celular)
assets/             ícono y tipografías (Outfit y Source Sans 3, licencia OFL)
js/util.js          utilidades y armado seguro del DOM
js/dominio.js       estados, roles y operaciones de auditoría
js/data/            catálogos y datos de ejemplo
js/store.js         datos en localStorage y reglas del sistema
js/auth.js          sesión simulada y permisos
js/sugerencias.js   puntaje de sugerencias
js/ui.js, charts.js componentes y gráficos
js/router.js        navegación por #/ruta
js/layout.js        barra superior y menús
js/views/           pantallas (recorrido.js: gráfico del recorrido del ticket)
api/db.js           base compartida en Vercel Blob (única pieza de servidor)
js/app.js           rutas y arranque
```
