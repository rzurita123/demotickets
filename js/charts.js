/* ==========================================================================
   Gráficos simples en HTML (sin librerías).

   Criterios: una sola serie por gráfico en el azul de ORMEN, sin leyenda
   (el título dice qué se mide), cifra en la punta de cada barra, grilla
   tenue, tooltip con el valor primero y, en cada tarjeta, la opción de ver
   los mismos datos como tabla. Al hacer clic en una barra se filtra el
   resto de la página; la barra elegida queda en azul y las demás en gris.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  // ------------------------------------------------------------ Tooltip ---

  function mostrarTooltip(ancla, datos) {
    const t = document.getElementById('tooltip');
    if (!t) return;
    U.vaciar(t).append(
      h('div', { class: 'valor' }, datos.valor),
      h('div', { class: 'clave' }, h('i'), datos.etiqueta),
      datos.detalle ? h('div', { class: 'chico suave' }, datos.detalle) : null);
    t.hidden = false;
    const r = ancla.getBoundingClientRect();
    const tw = t.offsetWidth;
    const th = t.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2;
    let y = r.top - th - 8;
    if (y < 8) y = r.bottom + 8;
    x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  }

  function ocultarTooltip() {
    const t = document.getElementById('tooltip');
    if (t) t.hidden = true;
  }

  window.addEventListener('scroll', ocultarTooltip, { passive: true });

  function textoValor(n, unidad) {
    const u = unidad || ['ticket', 'tickets'];
    return U.formatoNumero(n) + ' ' + (n === 1 ? u[0] : u[1]);
  }

  function conTooltip(el, ancla, datos) {
    const mostrar = () => mostrarTooltip(ancla(), datos);
    el.addEventListener('mouseenter', mostrar);
    el.addEventListener('focus', mostrar);
    el.addEventListener('mouseleave', ocultarTooltip);
    el.addEventListener('blur', ocultarTooltip);
  }

  // ------------------------------------------------------------- Barras ---

  /**
   * Barras horizontales (categorías).
   * barras({ titulo, datos: [{ clave, etiqueta, valor }], seleccion, alSeleccionar, unidad, total, rotulosLargos })
   * rotulosLargos: más ancho para el rótulo y hasta dos líneas (títulos de soluciones, por ejemplo).
   */
  function barras(op) {
    const max = Math.max(1, ...op.datos.map((d) => d.valor));
    const total = op.total != null ? op.total : op.datos.reduce((a, d) => a + d.valor, 0);
    const conSel = op.seleccion != null && op.seleccion !== '';
    const cont = h('div', { class: ['barras', conSel && 'con-seleccion', op.rotulosLargos && 'largos'], role: 'group', 'aria-label': op.titulo });
    for (const d of op.datos) {
      const sel = conSel && d.clave === op.seleccion;
      const relleno = h('span', { class: 'relleno', style: { width: 'calc((100% - 52px) * ' + (d.valor / max).toFixed(4) + ')' } });
      const interactiva = !!op.alSeleccionar;
      const fila = h(interactiva ? 'button' : 'div', {
        type: interactiva ? 'button' : null,
        class: 'barra-fila',
        dataset: { clave: d.clave },
        'aria-pressed': interactiva ? String(sel) : null,
        'aria-label': interactiva ? d.etiqueta + ': ' + textoValor(d.valor, op.unidad) + (sel ? '. Filtro aplicado; volvé a hacer clic para quitarlo.' : '. Filtrar por este valor.') : null,
        onClick: interactiva ? () => { ocultarTooltip(); op.alSeleccionar(sel ? null : d.clave); } : null,
      },
      h('span', { class: 'rotulo', title: d.etiqueta }, d.etiqueta),
      h('span', { class: 'pista' }, relleno, h('span', { class: 'cifra' }, U.formatoNumero(d.valor))));
      conTooltip(fila, () => relleno, { valor: textoValor(d.valor, op.unidad), etiqueta: d.etiqueta, detalle: total ? U.porcentaje(d.valor, total) + ' del total' : null });
      cont.append(fila);
    }
    return cont;
  }

  // ----------------------------------------------------------- Columnas ---

  const PASOS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

  function escala(maximo) {
    const objetivo = Math.max(4, maximo * 1.15);
    const paso = PASOS.find((p) => Math.ceil(objetivo / p) <= 5) || PASOS[PASOS.length - 1];
    const n = Math.ceil(objetivo / paso);
    const marcas = [];
    for (let i = 0; i <= n; i++) marcas.push(i * paso);
    return { max: n * paso, marcas };
  }

  /**
   * Columnas verticales (evolución en el tiempo).
   * columnas({ titulo, datos: [{ clave, etiqueta, etiquetaLarga, valor }], seleccion, alSeleccionar, unidad })
   */
  function columnas(op) {
    const maxDato = Math.max(0, ...op.datos.map((d) => d.valor));
    const e = escala(maxDato);
    const conSel = op.seleccion != null && op.seleccion !== '';
    const cont = h('div', { class: ['columnas', conSel && 'con-seleccion', op.datos.length > 12 && 'densas'], role: 'group', 'aria-label': op.titulo },
      h('div', { class: 'grilla', 'aria-hidden': 'true' }, e.marcas.map((m) => h('div', { class: m === 0 ? 'base' : null, style: { bottom: (m / e.max * 100) + '%' } }, h('span', null, U.formatoNumero(m))))));
    for (const d of op.datos) {
      const sel = conSel && d.clave === op.seleccion;
      const col = h('span', { class: 'col', style: { height: (d.valor / e.max * 100) + '%' } });
      const interactiva = !!op.alSeleccionar;
      const larga = d.etiquetaLarga || d.etiqueta;
      const el = h(interactiva ? 'button' : 'div', {
        type: interactiva ? 'button' : null,
        class: 'columna',
        dataset: { clave: d.clave },
        'aria-pressed': interactiva ? String(sel) : null,
        'aria-label': interactiva ? larga + ': ' + textoValor(d.valor, op.unidad) + (sel ? '. Filtro aplicado; volvé a hacer clic para quitarlo.' : '. Filtrar por este período.') : null,
        onClick: interactiva ? () => { ocultarTooltip(); op.alSeleccionar(sel ? null : d.clave); } : null,
      },
      h('span', { class: 'cifra' }, d.valor ? U.formatoNumero(d.valor) : ''),
      col,
      h('span', { class: 'eje-x' }, d.etiqueta));
      conTooltip(el, () => col, { valor: textoValor(d.valor, op.unidad), etiqueta: larga });
      cont.append(el);
    }
    return cont;
  }

  // ------------------------------------------------------------ Tarjeta ---

  /**
   * Tarjeta con título, gráfico y alternativa en tabla.
   * tarjeta({ titulo, descripcion, grafico, tabla: { columnas: [...], filas: [[...]] }, ancho, vacio, pie, enTabla, alCambiarVista })
   */
  function tarjeta(op) {
    const idTitulo = U.uid('graf');
    const cont = h('div');
    let enTabla = !!op.enTabla && !op.vacio && !!op.tabla;
    const textoBoton = document.createTextNode(enTabla ? 'Ver gráfico' : 'Ver tabla');
    const boton = h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', 'aria-pressed': String(enTabla), dataset: { vista: op.titulo } }, App.ui.icono('tabla', 'i-sm'), textoBoton);

    function tabla() {
      return h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla tabla-grafico' },
        h('caption', { class: 'sr-only' }, op.titulo),
        h('thead', null, h('tr', null, op.tabla.columnas.map((c, i) => h('th', { scope: 'col', class: i > 0 ? 'numero' : null }, c)))),
        h('tbody', null, op.tabla.filas.map((f) => h('tr', null, f.map((v, i) => (i === 0 ? h('th', { scope: 'row', style: 'text-transform: none; letter-spacing: 0; font-size: 14px; font-weight: 600; color: var(--texto); background: none;' }, v) : h('td', { class: 'numero' }, v))))))));
    }
    function pintar() {
      U.vaciar(cont).append(op.vacio ? op.vacio : enTabla ? tabla() : op.grafico);
    }
    boton.addEventListener('click', () => {
      enTabla = !enTabla;
      boton.setAttribute('aria-pressed', String(enTabla));
      textoBoton.textContent = enTabla ? 'Ver gráfico' : 'Ver tabla';
      pintar();
      if (op.alCambiarVista) op.alCambiarVista(enTabla);
    });
    if (op.vacio || !op.tabla) boton.hidden = true;
    pintar();
    return h('section', { class: ['card', 'grafico-card', op.ancho && 'ancho'], 'aria-labelledby': idTitulo },
      h('div', { class: 'cabeza' },
        h('div', { class: 'pila-sm', style: 'gap: 2px' }, h('h3', { id: idTitulo }, op.titulo), op.descripcion && h('p', null, op.descripcion)),
        boton),
      cont,
      op.pie || null);
  }

  App.charts = { barras, columnas, tarjeta, mostrarTooltip, ocultarTooltip, textoValor };
})(window.App = window.App || {});
