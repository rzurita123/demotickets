/* ==========================================================================
   Consulta del registro de auditoría (RNF4 y la consulta del log del
   anteproyecto): usuario, fecha, operación y ticket afectado.
   Si es un registro propio o se integra con la auditoría de ORMEN está
   pendiente de respuesta.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  const POR_PAGINA = 25;

  App.vistas.auditoria = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const D = App.dominio;
    const q = Object.assign({}, ctx.query);
    const registros = S.datos.auditoria;

    // ---- controles ----
    const inBuscar = h('input', { id: 'a-buscar', class: 'control', type: 'search', placeholder: 'Texto del detalle', value: q.q || '' });
    const selUsuario = ui.select({ id: 'a-usuario', vacio: 'Todos', valor: q.usuario, opciones: [
      { grupo: 'Mesa de ayuda', opciones: S.usuarios({ rol: 'OPERADOR' }).map((x) => ({ valor: x.id, texto: x.nombre })) },
      { grupo: 'Administradores', opciones: S.usuarios({ rol: 'ADMINISTRADOR' }).map((x) => ({ valor: x.id, texto: x.nombre })) },
      { grupo: 'Clientes', opciones: S.usuarios({ rol: 'CLIENTE' }).map((x) => ({ valor: x.id, texto: x.nombre + ' (' + S.nombre('localidades', x.localidadId) + ')' })) },
    ] });
    const selOperacion = ui.select({ id: 'a-operacion', vacio: 'Todas', valor: q.op, opciones: Object.keys(D.OPERACIONES).map((k) => ({ valor: k, texto: D.OPERACIONES[k] })).sort((a, b) => a.texto.localeCompare(b.texto, 'es')) });
    const inDesde = h('input', { id: 'a-desde', class: 'control', type: 'date', value: q.desde || '' });
    const inHasta = h('input', { id: 'a-hasta', class: 'control', type: 'date', value: q.hasta || '' });
    const inTicket = h('input', { id: 'a-ticket', class: 'control', type: 'text', inputmode: 'numeric', placeholder: 'Ej.: 1005', value: q.ticket || '' });
    const resultados = h('div');
    const total = h('p', { class: 'chico suave', 'aria-live': 'polite' });

    function aDia(v, finDelDia) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null;
      const [a, m, d] = v.split('-').map(Number);
      return new Date(a, m - 1, d + (finDelDia ? 1 : 0)).toISOString();
    }

    function filtrar() {
      const texto = U.normalizar(q.q);
      const desde = aDia(q.desde);
      const hasta = aDia(q.hasta, true);
      const numero = (q.ticket || '').replace(/\D/g, '');
      const t = numero ? S.ticketPorNumero(numero) : null;
      return registros.filter((r) =>
        (!q.usuario || r.usuarioId === q.usuario) &&
        (!q.op || r.operacion === q.op) &&
        (!desde || r.fecha >= desde) &&
        (!hasta || r.fecha < hasta) &&
        (!numero || (t && r.ticketId === t.id)) &&
        (!texto || U.normalizar(r.detalle).indexOf(texto) >= 0));
    }

    function sincronizar() {
      const limpio = {};
      CLAVES_FILTRO.concat('p').forEach((k) => { if (q[k] && !(k === 'p' && Number(q[k]) <= 1)) limpio[k] = q[k]; });
      App.router.actualizarQuery(limpio);
    }

    function cambiar(k, v) {
      q[k] = v || '';
      if (k !== 'p') q.p = '';
      sincronizar();
      pintar();
    }

    function celdaUsuario(id) {
      const x = S.usuario(id);
      if (!x) return h('span', { class: 'suave' }, '—');
      return h('div', { class: 'fila-sm', style: 'flex-wrap: nowrap' }, ui.avatar(x, 'sm'),
        h('div', { style: 'min-width: 0' }, h('span', { style: 'display: block; font-weight: 600; color: var(--tinta)' }, x.nombre),
          h('span', { class: 'chico suave' }, ui.nombreRol(x) + (x.rol === 'CLIENTE' ? ' · ' + S.nombre('localidades', x.localidadId) : ''))));
    }

    function celdaTicket(ticketId) {
      const t = ticketId ? S.ticket(ticketId) : null;
      if (!t || t.estado === 'BORRADOR') return h('span', { class: 'suave' }, '—');
      return h('a', { href: '#/tickets/' + t.numero, class: 'num' }, '#' + t.numero);
    }

    function celdaOperacion(op) {
      const texto = D.OPERACIONES[op] || op;
      if (op === 'ACCESO_DENEGADO') return h('span', { class: 'badge rechazada' }, ui.icono('candado', 'i-sm'), texto);
      return h('span', { class: op === 'LOGIN' || op === 'LOGOUT' ? 'suave' : 'fuerte' }, texto);
    }

    const CLAVES_FILTRO = ['q', 'usuario', 'op', 'desde', 'hasta', 'ticket'];
    const limpiar = h('button', { type: 'button', class: 'enlace-boton chico', onClick: () => {
      [inBuscar, inTicket, inDesde, inHasta, selUsuario, selOperacion].forEach((el) => { el.value = ''; });
      CLAVES_FILTRO.forEach((k) => { q[k] = ''; });
      cambiar('p', '');
    } }, 'Limpiar filtros');

    function pintar() {
      const lista = filtrar();
      limpiar.hidden = !CLAVES_FILTRO.some((k) => q[k]);
      total.textContent = U.plural(lista.length, 'registro', 'registros');
      U.vaciar(resultados);
      if (!lista.length) {
        resultados.append(ui.vacio({ icono: 'escudo', titulo: 'No hay registros con estos filtros', texto: 'Probá con otras fechas o quitá algún filtro.' }));
        return;
      }
      const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
      const pagina = Math.min(Math.max(1, Number(q.p) || 1), paginas);
      const filas = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((r) => h('tr', null,
        ui.celda('Fecha', h('span', { class: 'mono', style: 'white-space: nowrap' }, U.fechaHora(r.fecha))),
        ui.celda('Usuario', celdaUsuario(r.usuarioId)),
        ui.celda('Operación', celdaOperacion(r.operacion)),
        ui.celda('Ticket', celdaTicket(r.ticketId)),
        ui.celda('Detalle', h('span', { style: 'overflow-wrap: anywhere' }, r.detalle || '—'))));
      resultados.append(
        h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
          h('caption', { class: 'sr-only' }, 'Registro de auditoría'),
          h('thead', null, h('tr', null, ['Fecha y hora', 'Usuario', 'Operación', 'Ticket', 'Detalle'].map((t) => h('th', { scope: 'col' }, t)))),
          h('tbody', null, filas))),
        ui.paginador({ total: lista.length, pagina, porPagina: POR_PAGINA, alCambiar: (p) => { cambiar('p', String(p)); document.getElementById('titulo-pagina').scrollIntoView({ block: 'start' }); } }));
    }

    inBuscar.addEventListener('input', U.debounce(() => cambiar('q', inBuscar.value.trim()), 220));
    inTicket.addEventListener('input', U.debounce(() => cambiar('ticket', inTicket.value.trim()), 220));
    selUsuario.addEventListener('change', () => cambiar('usuario', selUsuario.value));
    selOperacion.addEventListener('change', () => cambiar('op', selOperacion.value));
    inDesde.addEventListener('change', () => cambiar('desde', inDesde.value));
    inHasta.addEventListener('change', () => cambiar('hasta', inHasta.value));
    pintar();

    return h('div', { class: 'pila' },
      ui.cabecera({ titulo: 'Auditoría' }),
      h('section', { class: 'card sin-padding', 'aria-label': 'Registro de auditoría' },
        h('div', { style: 'padding: 18px 20px 6px' },
          h('div', { class: 'filtros filtros-grilla', role: 'search', 'aria-label': 'Filtros de auditoría' },
            ui.campo({ nombre: 'q', id: 'a-buscar', etiqueta: 'Buscar', control: inBuscar, clase: 'buscar' }),
            ui.campo({ nombre: 'usuario', id: 'a-usuario', etiqueta: 'Usuario', control: selUsuario }),
            ui.campo({ nombre: 'op', id: 'a-operacion', etiqueta: 'Operación', control: selOperacion }),
            ui.campo({ nombre: 'desde', id: 'a-desde', etiqueta: 'Desde', control: inDesde }),
            ui.campo({ nombre: 'hasta', id: 'a-hasta', etiqueta: 'Hasta', control: inHasta }),
            ui.campo({ nombre: 'ticket', id: 'a-ticket', etiqueta: 'Ticket', control: inTicket })),
          h('div', { class: 'fila-entre', style: 'margin-bottom: 12px' }, total, limpiar)),
        resultados));
  };
})(window.App = window.App || {});
