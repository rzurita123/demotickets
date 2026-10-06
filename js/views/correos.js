/* ==========================================================================
   Correos simulados (RF3). ORMEN: avisar por correo al creador cuando un
   operador actualiza el ticket es "deseable, no obligatorio". En la demo no
   se envía nada: los correos quedan registrados acá.
   - Cliente: sus propios avisos.
   - ORMEN: todos (bandeja de salida de la demo).
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  const POR_PAGINA = 20;

  App.vistas.correos = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const esCliente = u.rol === 'CLIENTE';
    const todos = S.correosPara(u).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    const q = Object.assign({}, ctx.query);

    const inBuscar = h('input', { id: 'c-buscar', class: 'control', type: 'search', placeholder: 'Asunto, texto o número de ticket', value: q.q || '' });
    const destinatarios = esCliente ? [] : Array.from(new Set(todos.map((c) => c.paraUsuarioId))).map((id) => S.usuario(id)).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const selPara = esCliente ? null : ui.select({ id: 'c-para', vacio: 'Todos', valor: q.para, opciones: destinatarios.map((x) => ({ valor: x.id, texto: x.nombre + ' (' + S.nombre('localidades', x.localidadId) + ')' })) });
    const lista = h('div', { class: 'pila-sm' });
    const total = h('p', { class: 'chico suave', 'aria-live': 'polite' });

    function filtrar() {
      const texto = U.normalizar(q.q);
      return todos.filter((c) => {
        if (q.para && c.paraUsuarioId !== q.para) return false;
        if (!texto) return true;
        const t = S.ticket(c.ticketId);
        return U.normalizar(c.asunto + ' ' + c.cuerpo + ' ' + (t ? t.numero : '')).indexOf(texto) >= 0;
      });
    }

    function cambiar(k, v) {
      q[k] = v || '';
      if (k !== 'p') q.p = '';
      const limpio = {};
      ['q', 'para', 'p'].forEach((c) => { if (q[c] && !(c === 'p' && Number(q[c]) <= 1)) limpio[c] = q[c]; });
      App.router.actualizarQuery(limpio);
      pintar();
    }

    function correo(c) {
      const t = S.ticket(c.ticketId);
      const dest = S.usuario(c.paraUsuarioId);
      return h('details', { class: 'correo' },
        h('summary', null,
          h('span', { class: 'asunto' }, c.asunto),
          h('span', { class: 'chico suave', style: 'white-space: nowrap' }, ui.tiempo(c.fecha)),
          h('span', { class: 'para' }, 'Para: ', dest ? dest.nombre : '', ' <', c.para, '>')),
        h('div', { class: 'cuerpo-correo' },
          h('div', null, c.cuerpo),
          t && S.puedeVerTicket(t, u) ? h('p', { style: 'margin-top: 12px' }, h('a', { class: 'btn btn-secundario btn-sm', href: '#/tickets/' + t.numero }, 'Ver el ticket #' + t.numero)) : null));
    }

    function pintar() {
      const filtrados = filtrar();
      total.textContent = U.plural(filtrados.length, 'correo', 'correos');
      U.vaciar(lista);
      if (!filtrados.length) {
        lista.append(h('div', { class: 'card' }, ui.vacio({
          icono: 'correo',
          titulo: todos.length ? 'No hay correos con estos filtros' : 'Todavía no hay correos',
          texto: esCliente ? 'Cuando Mesa de ayuda responda o cambie el estado de un ticket que creaste, el aviso aparece acá.' : null,
        })));
        return;
      }
      const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
      const pagina = Math.min(Math.max(1, Number(q.p) || 1), paginas);
      filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).forEach((c) => lista.append(correo(c)));
      if (paginas > 1) {
        lista.append(h('div', { class: 'card sin-padding' }, ui.paginador({
          total: filtrados.length, pagina, porPagina: POR_PAGINA,
          alCambiar: (p) => { cambiar('p', String(p)); document.getElementById('titulo-pagina').scrollIntoView({ block: 'start' }); },
        })));
      }
    }

    inBuscar.addEventListener('input', U.debounce(() => cambiar('q', inBuscar.value.trim()), 220));
    if (selPara) selPara.addEventListener('change', () => cambiar('para', selPara.value));
    pintar();

    ctx.titulo(esCliente ? 'Mis avisos por correo' : 'Correos simulados');
    return h('div', { class: 'pila' },
      ui.cabecera({
        antetitulo: 'Demo',
        titulo: esCliente ? 'Mis avisos por correo' : 'Correos simulados',
        subtitulo: esCliente
          ? 'Los avisos que te mandaría el sistema cuando Mesa de ayuda actualiza un ticket que creaste. En la demo no se envían.'
          : 'Avisos al creador del ticket cuando Mesa de ayuda lo actualiza (comentario público, cambio de estado, cierre o reapertura). En la demo no se envían: quedan acá.',
      }),
      ui.aviso('ORMEN marcó el aviso por correo como deseable, no obligatorio. En la demo el correo sólo lleva información pública, nunca comentarios privados.', null, 'correo'),
      esCliente ? null : ui.avisoPendiente('A definir',
        'Si el ticket lo cargó Mesa de ayuda en nombre de la localidad, todavía no está definido a quién avisar: en la demo no se envía correo. WhatsApp y Slack estaban en las notas originales, pero ORMEN después sólo habló de correo.'),
      h('section', { class: 'card compacta', 'aria-label': 'Filtros' },
        h('div', { class: 'filtros', role: 'search', 'aria-label': 'Filtros de correos', style: 'margin-bottom: 0' },
          ui.campo({ nombre: 'q', id: 'c-buscar', etiqueta: 'Buscar', control: inBuscar, clase: 'buscar' }),
          selPara && ui.campo({ nombre: 'para', id: 'c-para', etiqueta: 'Destinatario', control: selPara }),
          h('div', { class: 'campo', style: 'min-width: 0; justify-content: flex-end' }, total))),
      lista);
  };
})(window.App = window.App || {});
