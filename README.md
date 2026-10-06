# Sistema de tickets ORMEN · Demo navegable

Demo de frontend del sistema de tickets de Mesa de ayuda de ORMEN (Proyecto Integrador, Universidad ORT Uruguay). Simula el sistema completo con datos ficticios para mostrarlo al equipo y a ORMEN, y para ir ajustándolo a partir de lo que respondan.

- Sin dependencias externas: HTML, CSS y JavaScript propios. No usa frameworks, CDN, npm ni paso de compilación.
- Los datos viven en el navegador de cada persona (`localStorage`). Nada se envía a un servidor.
- Lo confirmado por ORMEN, lo pendiente y los supuestos del equipo están en la página **Notas de la demo** (`#/notas`, también accesible sin ingresar). En las pantallas, lo pendiente lleva una marca dorada.

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
| `vpereira` | Operadora de Mesa de ayuda | Crear y atender tickets, sugerencias, cierre con solución, borradores |
| `scabrera` | Administradora | Aprobar soluciones, estadísticas, usuarios, localidades, catálogos, auditoría |
| `mtechera` | Cliente de Pando | Crear tickets y ver los de su localidad |
| `lgomez` | Cliente de Lagomar | Comprobar que no ve los tickets de Pando |

Para mostrarlo de a dos, abrí otra pestaña con otro usuario: las pestañas comparten los datos y se actualizan solas.

## Publicarla en Vercel

No hace falta compilar nada: Vercel la sirve como sitio estático. Las rutas usan `#/`, así que no hacen falta reglas de redirección.

**Desde un repositorio de GitHub** (cuando exista):

1. Subí esta carpeta al repositorio, por ejemplo como `demo/`.
2. En Vercel: *Add New… → Project* e importá el repositorio.
3. *Framework Preset*: **Other**. *Root Directory*: la carpeta de la demo (por ejemplo `demo`).
4. Dejá vacíos el comando de build y el directorio de salida, y apretá *Deploy*.

Cada cambio que se suba al repositorio genera una nueva versión publicada.

**Desde la terminal, sin repositorio:** con la CLI de Vercel instalada (`npm i -g vercel`), ejecutá `vercel` dentro de esta carpeta y respondé las preguntas (sin build). `vercel --prod` publica la versión definitiva.

La dirección que da Vercel la puede abrir cualquiera que la tenga. La página les pide a los buscadores que no la indexen (`noindex`) y los datos son ficticios.

## Datos

- La primera vez que se abre, la demo genera unos 160 tickets de ejemplo en 11 localidades, con fechas relativas a ese momento. A partir de ahí quedan guardados en ese navegador.
- Cada persona tiene su propia copia: lo que hace una no lo ve otra en su computadora.
- **Restablecer datos de la demo**, en el menú del usuario, vuelve a los datos de ejemplo.
- Los correos no se envían: quedan en **Correos simulados**.

## Cómo modificarla

| Qué cambiar | Dónde |
|---|---|
| Colores y tipografía | Variables al principio de `css/styles.css` (paleta ORMEN) |
| Localidades, sistemas, subsistemas, tipos, criticidades, usuarios y puntajes iniciales | `js/data/catalogos.js` |
| Tickets y soluciones de ejemplo | `js/data/semilla.js` |
| Reglas: estados, validaciones, visibilidad, correos, auditoría | `js/store.js` |
| Permisos por rol | `js/auth.js` |
| Cálculo de las sugerencias de solución | `js/sugerencias.js` |
| Pantallas (una por archivo) | `js/views/` |
| Rutas y qué rol ve cada pantalla | `js/app.js` |
| Confirmado, pendiente y supuestos | `js/views/notas.js` |

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
js/views/           pantallas
js/app.js           rutas y arranque
```
