/* ==========================================================================
   Catálogos (rol Administrador): sistemas, subsistemas, tipos de problema,
   criticidades y grupos de soporte. Se entra desde el menú del usuario; la
   sección Administración (usuarios y localidades) ya no existe.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  function marco(ctx, op) {
    ctx.titulo(op.titulo);
    return h('div', { class: 'pila' },
      App.ui.cabecera({ titulo: op.titulo, acciones: op.acciones }),
      op.contenido);
  }

  /** Ventana con un formulario; `guardar` lanza ErrorDemo con campos si algo falta. */
  function modalFormulario(op) {
    const ui = App.ui;
    const cuerpo = h('form', { class: 'pila', novalidate: true }, op.campos);
    const m = ui.modal({
      titulo: op.titulo,
      antetitulo: op.antetitulo || 'Catálogos',
      cuerpo,
      tamano: op.tamano,
      acciones: [
        { texto: 'Cancelar', clase: 'btn-neutro' },
        {
          texto: op.textoGuardar || 'Guardar', clase: 'btn-primario', fn: () => {
            try {
              op.guardar();
            } catch (e) {
              if (e.campos) { ui.mostrarErrores(cuerpo, e.campos, cuerpo); return false; }
              throw e;
            }
            return true;
          },
        },
      ],
    });
    // Enter en un campo de texto guarda.
    cuerpo.addEventListener('submit', (e) => { e.preventDefault(); m.botones[m.botones.length - 1].click(); });
    return m;
  }

  // ---------------------------------------------------------- Catálogos ---

  App.vistas.adminCatalogos = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const registrados = S.datos.tickets.filter((t) => t.estado !== 'BORRADOR');
    const usos = {
      sistemas: U.contarPor(registrados, (t) => t.sistemaId),
      subsistemas: U.contarPor(registrados, (t) => t.subsistemaId),
      tiposProblema: U.contarPor(registrados, (t) => t.tipoProblemaId),
      criticidades: U.contarPor(registrados, (t) => t.criticidadId),
      gruposSoporte: U.contarPor(registrados, (t) => (t.elevadoA && t.elevadoA.tipo === 'grupo' ? t.elevadoA.id : null)),
    };
    const SINGULAR = { sistemas: 'sistema', subsistemas: 'subsistema', tiposProblema: 'tipo de problema', criticidades: 'criticidad', gruposSoporte: 'grupo de soporte' };

    function abrir(tipo, item, sistemaId) {
      const inNombre = h('input', { id: 'c-nombre', class: 'control', type: 'text', autocomplete: 'off', value: item ? item.nombre : '' });
      const sis = sistemaId ? S.sistema(sistemaId) : null;
      modalFormulario({
        titulo: item ? 'Renombrar ' + SINGULAR[tipo] : 'Nuevo ' + SINGULAR[tipo] + (sis ? ' de ' + sis.nombre : ''),
        antetitulo: 'Catálogos',
        tamano: 'angosto',
        textoGuardar: item ? 'Guardar' : 'Agregar',
        campos: [
          ui.campo({ nombre: 'nombre', id: 'c-nombre', etiqueta: 'Nombre', requerido: true, control: inNombre }),
        ],
        guardar: () => {
          S.guardarItemCatalogo(tipo, { nombre: inNombre.value, sistemaId }, u, item ? item.id : null);
          ui.toast(item ? 'Cambios guardados.' : U.capitalizar(SINGULAR[tipo]) + ' agregado.');
          ctx.refrescar();
        },
      });
    }

    function alternar(tipo, item) {
      const activar = item.activo === false;
      try {
        S.cambiarActivoItem(tipo, item.id, u, activar);
        ctx.refrescar();
        ui.toast('«' + item.nombre + '» ' + (activar ? 'vuelve a estar disponible.' : 'ya no se puede elegir en tickets nuevos.'), {
          accion: { texto: 'Deshacer', fn: () => { try { S.cambiarActivoItem(tipo, item.id, u, !activar); ctx.refrescar(); } catch (e) { ui.mostrarError(e); } } },
        });
      } catch (e) { ui.mostrarError(e); }
    }

    function pastilla(tipo, item) {
      const inactivo = item.activo === false;
      const n = usos[tipo].get(item.id) || 0;
      return h('li', { class: ['item-catalogo', inactivo && 'inactivo'], title: U.plural(n, 'ticket', 'tickets') },
        h('span', { class: 'nombre-item' }, item.nombre),
        inactivo ? h('span', { class: 'sr-only' }, '(inactivo)') : null,
        h('button', { type: 'button', 'aria-label': 'Renombrar «' + item.nombre + '»', onClick: () => abrir(tipo, item, item.sistemaId) }, ui.icono('editar', 'i-sm')),
        h('button', { type: 'button', 'aria-label': (inactivo ? 'Activar' : 'Desactivar') + ' «' + item.nombre + '»', title: inactivo ? 'Activar' : 'Desactivar', onClick: () => alternar(tipo, item) },
          ui.icono(inactivo ? 'reabrir' : 'x', 'i-sm')));
    }

    function tarjetaLista(tipo, titulo) {
      return h('section', { class: 'card pila', 'aria-labelledby': 'cat-' + tipo },
        h('div', { class: 'fila-entre' },
          h('h2', { id: 'cat-' + tipo }, titulo),
          h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => abrir(tipo, null) }, ui.icono('mas', 'i-sm'), 'Agregar')),
        h('ul', { class: 'lista-items' }, S.catalogo(tipo).map((x) => pastilla(tipo, x))));
    }

    const arbol = h('div', { class: 'arbol' }, S.sistemas().map((s) => {
      const inactivo = s.activo === false;
      const subs = S.subsistemasDe(s.id);
      return h('div', { class: ['arbol-sistema', inactivo && 'inactivo'] },
        h('div', { class: 'fila-entre' },
          h('div', { class: 'fila-sm' },
            h('strong', { class: 'nombre-item', style: 'color: var(--tinta)' }, s.nombre),
            inactivo ? h('span', { class: 'badge inactivo' }, 'Inactivo') : null,
            h('span', { class: 'chico suave' }, U.plural(usos.sistemas.get(s.id) || 0, 'ticket', 'tickets'))),
          h('div', { class: 'fila-sm' },
            h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', onClick: () => abrir('subsistemas', null, s.id) }, ui.icono('mas', 'i-sm'), 'Subsistema'),
            h('button', { type: 'button', class: 'btn btn-fantasma btn-sm btn-icono', 'aria-label': 'Renombrar el sistema ' + s.nombre, title: 'Renombrar', onClick: () => abrir('sistemas', s) }, ui.icono('editar', 'i-sm')),
            h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', onClick: () => alternar('sistemas', s) }, inactivo ? 'Activar' : 'Desactivar'))),
        subs.length
          ? h('ul', null, subs.map((x) => pastilla('subsistemas', x)))
          : h('p', { class: 'chico suave', style: 'padding: 8px 14px 10px' }, 'Sin subsistemas.'));
    }));

    return marco(ctx, {
      seccion: 'catalogos',
      titulo: 'Catálogos',
      contenido: [
        h('section', { class: 'card pila', 'aria-labelledby': 'cat-sistemas' },
          h('div', { class: 'fila-entre' },
            h('h2', { id: 'cat-sistemas' }, 'Sistemas y subsistemas'),
            h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => abrir('sistemas', null) }, ui.icono('mas', 'i-sm'), 'Nuevo sistema')),
          arbol),
        h('div', { class: 'grid-3' },
          tarjetaLista('tiposProblema', 'Tipos de problema'),
          tarjetaLista('criticidades', 'Criticidades'),
          tarjetaLista('gruposSoporte', 'Grupos de soporte')),
      ],
    });
  };
})(window.App = window.App || {});
