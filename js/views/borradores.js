/* ==========================================================================
   Borradores del operador (HU14 y HU15): reemplazan el bloc de notas que
   usan hoy durante la atención. Sólo los ve quien los creó y no cuentan en
   estadísticas.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  App.vistas.borradores = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const lista = S.borradoresDe(u);

    async function descartar(b) {
      const ok = await ui.confirmar({ titulo: 'Descartar el borrador', mensaje: 'Se borra el borrador y lo que tenga cargado. No se puede deshacer.', textoConfirmar: 'Descartar', peligro: true });
      if (!ok) return;
      try {
        S.descartarBorrador(b.id, u);
        ui.toast('Borrador descartado.');
        ctx.refrescar();
      } catch (e) { ui.mostrarError(e); }
    }

    let contenido;
    if (!lista.length) {
      contenido = h('div', { class: 'card' }, ui.vacio({
        icono: 'borrador',
        titulo: 'No tenés borradores',
        texto: 'Mientras cargás un ticket podés guardarlo como borrador y terminarlo después.',
        accion: h('a', { class: 'btn btn-primario', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Nuevo ticket'),
      }));
    } else {
      const filas = lista.map((b) => {
        const faltan = Object.keys(S.validarTicket(b, u)).length;
        const tr = h('tr', { class: 'clic' },
          ui.celda('Borrador', h('div', { class: 'titulo-celda' },
            h('a', { href: '#/borradores/' + b.id }, b.titulo || 'Sin título'),
            h('span', { class: 'sub' }, U.truncar(b.descripcion, 110) || 'Sin descripción')), 'sin-label'),
          ui.celda('Localidad', b.localidadId ? S.nombre('localidades', b.localidadId) : h('span', { class: 'suave' }, 'Sin elegir')),
          ui.celda('Sistema', b.sistemaId ? S.nombre('sistemas', b.sistemaId) : h('span', { class: 'suave' }, 'Sin elegir')),
          ui.celda('Datos', faltan ? h('span', { class: 'badge pendiente-aprob' }, U.plural(faltan, 'dato por completar', 'datos por completar')) : h('span', { class: 'badge aprobada' }, ui.icono('check', 'i-sm'), 'Listo para crear')),
          ui.celda('Guardado', ui.tiempo(b.actualizadoEn)),
          ui.celda('', h('div', { class: 'fila-sm', style: 'justify-content: flex-end; flex-wrap: nowrap' },
            h('a', { class: 'btn btn-secundario btn-sm', href: '#/borradores/' + b.id }, 'Continuar'),
            h('button', { type: 'button', class: 'btn btn-fantasma btn-sm btn-icono', 'aria-label': 'Descartar el borrador ' + (b.titulo || 'sin título'), onClick: () => descartar(b) }, ui.icono('basura', 'i-sm'))), 'derecha sin-label'));
        tr.addEventListener('click', (e) => { if (!e.target.closest('a, button')) App.router.ir('/borradores/' + b.id); });
        return tr;
      });
      contenido = h('section', { class: 'card sin-padding', 'aria-label': 'Mis borradores' }, h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
        h('thead', null, h('tr', null, ['Borrador', 'Localidad', 'Sistema', 'Datos', 'Guardado', ''].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, filas))));
    }

    return h('div', { class: 'pila' },
      ui.cabecera({
        antetitulo: 'Mesa de ayuda',
        titulo: 'Mis borradores',
        subtitulo: 'Tickets a medio cargar. Sólo los ves vos: la localidad no los ve y no cuentan en estadísticas.',
        acciones: [h('a', { class: 'btn btn-primario', href: '#/tickets/nuevo' }, ui.icono('mas', 'i-sm'), 'Nuevo ticket')],
      }),
      contenido);
  };
})(window.App = window.App || {});
