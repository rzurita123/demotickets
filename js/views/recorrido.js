/* ==========================================================================
   Recorrido del ticket: por qué personas, grupos y estados pasó.

   Gráfico de carriles: una fila por responsable (la cola de Mesa de ayuda,
   cada operador y cada grupo de soporte, en el orden en que aparecen) y una
   columna por paso. Las elevaciones se dibujan en naranja. Debajo va la
   misma información como lista, para leerla sin el gráfico.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const s = U.s;

  const COLORES = {
    ABIERTO: { relleno: 'var(--azul-claro)', trazo: '#1D5F8F' },
    EN_PROCESO: { relleno: 'var(--dorado-claro)', trazo: 'var(--dorado-oscuro)' },
    BLOQUEADO: { relleno: 'var(--rojo-claro)', trazo: 'var(--rojo)' },
    CERRADO: { relleno: 'var(--verde-claro)', trazo: 'var(--verde)' },
  };

  const MOTIVOS = {
    creado: 'Creado',
    tomado: 'Tomado',
    asignado: 'Asignado',
    liberado: 'Devuelto a la cola',
    elevado: 'Elevado',
    bloqueo: 'Bloqueado',
    desbloqueo: 'Desbloqueado',
    cierre: 'Cerrado',
    registroDirecto: 'Registrado ya resuelto',
    reapertura: 'Reabierto',
  };

  const clave = (r) => r.tipo + ':' + r.id;

  function etiquetaCarril(r) {
    const S = App.store;
    if (r.tipo === 'cola') return { nombre: 'Cola de Mesa de ayuda', detalle: 'Sin asignar' };
    if (r.tipo === 'grupo') return { nombre: S.nombreDestino(r), detalle: 'Grupo de soporte' };
    const u = S.usuario(r.id);
    return { nombre: u ? u.nombre : 'Usuario eliminado', detalle: u && u.rol === 'ADMINISTRADOR' ? 'ORMEN' : 'Mesa de ayuda' };
  }

  function duracionPaso(p) {
    if (p.estado === 'CERRADO') return null;
    const fin = p.hasta ? new Date(p.hasta) : new Date();
    return U.duracion(Math.max(0, fin - new Date(p.desde))) + (p.hasta ? '' : ' (sigue)');
  }

  /**
   * Gráfico de carriles. `disponible` es el ancho del contenedor: las columnas se
   * reparten ese espacio (con un mínimo; si no entra, se desplaza) y, con lugar
   * de sobra, los carriles y los nodos crecen.
   */
  function grafico(pasos, disponible) {
    const carriles = [];
    for (const p of pasos) if (!carriles.some((c) => clave(c) === clave(p.responsable))) carriles.push(p.responsable);
    const fila = new Map(carriles.map((c, i) => [clave(c), i]));

    const angosto = disponible < 600;
    const amplio = disponible >= 1000;
    const ANCHO_ETIQ = angosto ? 128 : amplio ? 230 : 196;
    const COL_MIN = angosto ? 104 : 124;
    const COL = Math.max(COL_MIN, Math.min(360, Math.floor((disponible - ANCHO_ETIQ - 16) / pasos.length)));
    const ALTO = amplio ? 84 : 64;
    const ARRIBA = 46;
    const R_NODO = amplio ? 14 : 11;
    const ancho = Math.max(disponible, ANCHO_ETIQ + pasos.length * COL + 16);
    const alto = ARRIBA + carriles.length * ALTO + 8;
    const x = (i) => ANCHO_ETIQ + i * COL + COL / 2;
    const r = (n) => n * R_NODO / 11; // medidas de los nodos, proporcionales al radio
    const y = (p) => ARRIBA + fila.get(clave(p.responsable)) * ALTO + ALTO / 2;

    const svg = s('svg', {
      class: 'recorrido-svg', width: ancho, height: alto, viewBox: '0 0 ' + ancho + ' ' + alto,
      role: 'img', 'aria-label': 'Gráfico del recorrido: ' + pasos.length + ' pasos por ' + U.plural(carriles.length, 'responsable', 'responsables') + '. El detalle está en la lista de abajo.',
    });
    svg.append(s('defs', null,
      s('marker', { id: 'rec-flecha', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' },
        s('path', { d: 'M0 0 L10 5 L0 10 z', fill: 'var(--borde-control)' })),
      s('marker', { id: 'rec-flecha-elev', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' },
        s('path', { d: 'M0 0 L10 5 L0 10 z', fill: 'var(--naranja)' }))));

    // Carriles
    carriles.forEach((c, i) => {
      const y0 = ARRIBA + i * ALTO;
      const et = etiquetaCarril(c);
      svg.append(
        s('rect', { x: 0, y: y0, width: ancho, height: ALTO, fill: i % 2 ? 'var(--superficie)' : 'var(--superficie-2)' }),
        s('line', { x1: ANCHO_ETIQ, y1: y0 + ALTO / 2, x2: ancho - 8, y2: y0 + ALTO / 2, stroke: 'var(--grilla)', 'stroke-dasharray': '2 4' }),
        s('text', { x: 14, y: y0 + ALTO / 2 - 3, class: 'rec-carril' }, U.truncar(et.nombre, angosto ? 15 : 24)),
        s('text', { x: 14, y: y0 + ALTO / 2 + 14, class: 'rec-carril-detalle' }, et.detalle),
        s('title', null, et.nombre));
    });
    svg.append(s('line', { x1: ANCHO_ETIQ - 8, y1: ARRIBA, x2: ANCHO_ETIQ - 8, y2: alto - 8, stroke: 'var(--borde)' }));

    // Encabezado de columnas
    pasos.forEach((p, i) => {
      svg.append(
        s('text', { x: x(i), y: 18, 'text-anchor': 'middle', class: 'rec-col' }, 'Paso ' + (i + 1)),
        s('text', { x: x(i), y: 34, 'text-anchor': 'middle', class: 'rec-col-fecha' }, U.diaMes(p.desde) + ' ' + U.hora(p.desde)));
    });

    // Conectores
    for (let i = 0; i < pasos.length - 1; i++) {
      const x1 = x(i) + r(13);
      const x2 = x(i + 1) - r(15);
      const y1 = y(pasos[i]);
      const y2 = y(pasos[i + 1]);
      const xm = (x1 + x2) / 2;
      const elev = pasos[i + 1].motivo === 'elevado';
      svg.append(s('path', {
        d: y1 === y2 ? 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 : 'M' + x1 + ' ' + y1 + ' C' + xm + ' ' + y1 + ' ' + xm + ' ' + y2 + ' ' + x2 + ' ' + y2,
        fill: 'none', stroke: elev ? 'var(--naranja)' : 'var(--borde-control)', 'stroke-width': elev ? 2.5 : 1.6,
        'marker-end': elev ? 'url(#rec-flecha-elev)' : 'url(#rec-flecha)',
      }));
    }

    // Nodos
    pasos.forEach((p, i) => {
      const cx = x(i);
      const cy = y(p);
      const col = COLORES[p.estado] || COLORES.ABIERTO;
      const elev = p.motivo === 'elevado';
      const g = s('g', null,
        s('title', null, 'Paso ' + (i + 1) + ': ' + MOTIVOS[p.motivo] + ' · ' + App.store.nombreEstado(p.estado) + ' · ' + App.store.nombreResponsable(p.responsable) + ' · ' + U.fechaHora(p.desde)),
        elev ? s('circle', { cx, cy, r: r(16), fill: 'none', stroke: 'var(--naranja)', 'stroke-width': 2, 'stroke-dasharray': '3 2' }) : null,
        s('circle', { cx, cy, r: R_NODO, fill: col.relleno, stroke: col.trazo, 'stroke-width': 2.5 }),
        p.estado === 'CERRADO' ? s('path', { d: 'M' + (cx - r(5)) + ' ' + cy + ' l' + r(3.5) + ' ' + r(3.5) + ' l' + r(6.5) + ' ' + -r(7), fill: 'none', stroke: col.trazo, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) : null,
        s('text', { x: cx, y: cy + r(28), 'text-anchor': 'middle', class: 'rec-nodo-estado', fill: col.trazo }, App.store.nombreEstado(p.estado)),
        elev ? s('text', { x: cx, y: cy - r(21), 'text-anchor': 'middle', class: 'rec-nodo-elev' }, 'Elevado') : null);
      svg.append(g);
    });
    return svg;
  }

  function leyenda() {
    const S = App.store;
    return h('div', { class: 'rec-leyenda' },
      ['ABIERTO', 'EN_PROCESO', 'BLOQUEADO', 'CERRADO'].map((e) => h('span', null, h('i', { style: 'background:' + COLORES[e].relleno + ';border-color:' + COLORES[e].trazo }), S.nombreEstado(e))),
      h('span', null, h('i', { class: 'elev' }), 'Elevación'));
  }

  function lista(pasos, u) {
    const S = App.store;
    const ui = App.ui;
    const esCliente = u.rol === 'CLIENTE';
    return h('ol', { class: 'rec-lista' }, pasos.map((p, i) => {
      const autor = S.usuario(p.autorId);
      const dur = duracionPaso(p);
      const nota = p.texto && !esCliente && (p.motivo === 'elevado' || p.motivo === 'bloqueo' || p.motivo === 'reapertura')
        ? h('span', { class: 'chico suave nota' }, (p.visibilidad === 'PUBLICO' ? 'Motivo: «' : 'Motivo (privado): «') + p.texto + '»')
        : p.texto && esCliente && p.motivo === 'bloqueo' && p.visibilidad === 'PUBLICO' ? h('span', { class: 'chico suave nota' }, 'Motivo: «' + p.texto + '»') : null;
      return h('li', { class: p.motivo === 'elevado' && 'elevado' },
        h('span', { class: 'rec-num', 'aria-hidden': 'true' }, i + 1),
        h('div', { class: 'pila-sm' },
          h('div', { class: 'fila-sm' },
            h('strong', null, MOTIVOS[p.motivo]),
            p.motivo === 'elevado' ? [' a ', h('strong', null, S.nombreResponsable(p.responsable))] : null,
            ui.badgeEstado(p.estado)),
          h('span', { class: 'chico' },
            p.motivo === 'elevado' ? '' : 'Lo tiene: ' + S.nombreResponsable(p.responsable) + ' · ',
            U.fechaHora(p.desde), autor ? ' · por ' + autor.nombre : '', dur ? ' · ' + dur : ''),
          nota));
    }));
  }

  /** Ventana con el recorrido del ticket. */
  function abrir(t, u) {
    const S = App.store;
    const ui = App.ui;
    const pasos = S.recorrido(t);
    const elevaciones = pasos.filter((p) => p.motivo === 'elevado').length;
    const resumen = h('p', { class: 'chico' },
      U.plural(pasos.length, 'paso', 'pasos'), ' · ',
      elevaciones ? U.plural(elevaciones, 'elevación', 'elevaciones') : 'sin elevaciones',
      t.elevadoA ? [' · último destino: ', h('strong', null, S.nombreDestino(t.elevadoA))] : null);
    const envoltura = h('div', { class: 'recorrido-envoltura', tabindex: '0', 'aria-label': 'Gráfico del recorrido (desplazable)' });
    let anchoDibujado = 0;
    function dibujar() {
      const disponible = envoltura.clientWidth || 800;
      if (Math.abs(disponible - anchoDibujado) < 8) return;
      anchoDibujado = disponible;
      U.vaciar(envoltura).append(grafico(pasos, disponible));
    }
    ui.modal({
      antetitulo: 'Ticket #' + t.numero,
      titulo: 'Recorrido del ticket',
      tamano: 'completo',
      cuerpo: [
        resumen,
        leyenda(),
        envoltura,
        h('h3', { class: 'chico fuerte' }, 'Paso a paso'),
        lista(pasos, u),
      ],
      acciones: [{ texto: 'Cerrar', clase: 'btn-neutro' }],
    });
    // La ventana ya está en pantalla: se dibuja con su ancho real y se vuelve a dibujar si cambia.
    dibujar();
    const alCambiarTamano = U.debounce(() => {
      if (!envoltura.isConnected) { dejarDeObservar(); return; }
      dibujar();
    }, 120);
    const obs = window.ResizeObserver ? new ResizeObserver(alCambiarTamano) : null;
    if (obs) obs.observe(envoltura);
    window.addEventListener('resize', alCambiarTamano);
    function dejarDeObservar() {
      if (obs) obs.disconnect();
      window.removeEventListener('resize', alCambiarTamano);
    }
  }

  App.recorrido = { abrir };
})(window.App = window.App || {});
