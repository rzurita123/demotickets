/* ==========================================================================
   Alta de tickets.
   - Cliente (HU02): su localidad queda fija.
   - Operador (HU01): elige la localidad, ve sugerencias de solución
     mientras escribe (HU03), puede guardar un borrador (HU14/HU15) o
     registrarlo ya Cerrado, si la tarea se solucionó durante la llamada.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  function formularioTicket(ctx, op) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const esOperador = u.rol === 'OPERADOR';
    const b = op.borrador || null;
    const pre = op.prefill || {}; // datos que llegan desde la búsqueda de soluciones
    // El operador decide primero si el ticket queda Abierto ('nuevo') o Cerrado ('resuelto').
    let modo = !esOperador || b ? 'nuevo' : op.modoInicial === 'resuelto' ? 'resuelto' : null;
    let solucionCatalogoId = null;
    let ticketOrigen = null; // número del ticket del que se copió la solución (sólo informativo)
    const marcar = () => ctx.marcarSucio(true);

    // ------------------------------------------------------- Controles ---
    const selLocalidad = esOperador
      ? ui.select({ id: 't-localidad', vacio: 'Elegí la localidad', valor: b ? b.localidadId : pre.localidadId || '', opciones: S.localidades(true).map((l) => ({ valor: l.id, texto: l.nombre })) })
      : h('input', { id: 't-localidad', class: 'control', type: 'text', readonly: true, value: S.nombre('localidades', u.localidadId) });
    const selSistema = ui.select({ id: 't-sistema', vacio: 'Elegí el sistema o servicio', valor: b ? b.sistemaId : pre.sistemaId || '', opciones: S.sistemas(true).map((s) => ({ valor: s.id, texto: s.nombre })) });
    const selSub = h('select', { id: 't-subsistema', class: 'control' });
    function cargarSubsistemas(valor) {
      U.vaciar(selSub);
      const subs = selSistema.value ? S.subsistemasDe(selSistema.value, true) : [];
      selSub.append(h('option', { value: '' }, selSistema.value ? 'Sin subsistema' : 'Elegí primero el sistema'));
      subs.forEach((x) => selSub.append(h('option', { value: x.id }, x.nombre)));
      selSub.disabled = !selSistema.value;
      selSub.value = valor && subs.some((x) => x.id === valor) ? valor : '';
    }
    cargarSubsistemas(b ? b.subsistemaId : pre.subsistemaId || '');
    selSistema.addEventListener('change', () => cargarSubsistemas(''));

    const segTipo = ui.segmentado({ nombre: 'tipoSolicitud', valor: b ? b.tipoSolicitudId || 'ts-atencion' : 'ts-atencion', opciones: S.catalogo('tiposSolicitud', true).map((x) => ({ valor: x.id, texto: x.nombre, icono: x.id === 'ts-sugerencia' ? 'bombilla' : null })) });
    const segCri = ui.segmentado({ nombre: 'criticidad', valor: b ? b.criticidadId : '', opciones: S.catalogo('criticidades', true).map((c) => ({ valor: c.id, texto: c.nombre, punto: c.clase })) });
    const selTipoProblema = esOperador ? ui.select({ id: 't-tipo-problema', valor: (b && b.tipoProblemaId) || 'tp-nodef', opciones: S.catalogo('tiposProblema', true).map((x) => ({ valor: x.id, texto: x.nombre })) }) : null;
    const inTitulo = h('input', { id: 't-titulo', class: 'control', type: 'text', maxlength: '120', autocomplete: 'off', value: b ? b.titulo : pre.titulo || '', placeholder: 'Por ejemplo: la impresora de la terminal no imprime' });
    const inDesc = h('textarea', { id: 't-descripcion', class: 'control', rows: '6', value: b ? b.descripcion : pre.descripcion || '', placeholder: esOperador ? 'Qué cuenta la agencia: qué pasa, desde cuándo, qué mensaje aparece…' : 'Contanos qué pasa, desde cuándo y qué mensaje aparece en pantalla.' });
    const imagenes = ui.selectorImagenes({ inicial: b ? b.adjuntos : [], pegarEn: [inDesc], etiqueta: 'Imágenes del problema', alCambiar: () => { marcar(); } });

    // Resolución (ticket Cerrado)
    const inSolucion = h('textarea', { id: 't-solucion', class: 'control', rows: '5', placeholder: 'Qué se hizo para resolverlo, paso a paso.' });
    const basadaEn = h('div', { class: 'fila-sm' });
    const imgSolucion = ui.selectorImagenes({ pegarEn: [inSolucion], etiqueta: 'Imágenes de la resolución', alCambiar: marcar });
    const chkProponer = h('input', { type: 'checkbox', id: 't-proponer' });
    const inPropTitulo = h('input', { id: 't-prop-titulo', class: 'control', type: 'text', maxlength: '120' });
    const palabras = ui.entradaPalabras({ id: 't-prop-palabras', alCambiar: marcar });
    const bloqueProponer = h('div', { class: 'pila', hidden: true },
      ui.campo({ nombre: 'propuestaTitulo', id: 't-prop-titulo', etiqueta: 'Título de la solución reutilizable', requerido: true, control: inPropTitulo }),
      ui.campo({ nombre: 'propuestaPalabras', id: 't-prop-palabras', etiqueta: 'Palabras clave', requerido: true, control: palabras.el }));
    chkProponer.addEventListener('change', () => {
      bloqueProponer.hidden = !chkProponer.checked;
      if (chkProponer.checked && !inPropTitulo.value.trim()) inPropTitulo.value = inTitulo.value.trim();
    });

    function pintarBasadaEn() {
      U.vaciar(basadaEn);
      chkProponer.disabled = !!solucionCatalogoId;
      if (solucionCatalogoId) {
        chkProponer.checked = false;
        bloqueProponer.hidden = true;
        const s = S.solucion(solucionCatalogoId);
        basadaEn.append(h('span', { class: 'chip-activo' }, ui.icono('libro', 'i-sm'), 'Basada en la solución reutilizable «' + (s ? s.titulo : '') + '»',
          h('button', { type: 'button', 'aria-label': 'Quitar la referencia a la solución reutilizable', onClick: () => { solucionCatalogoId = null; pintarBasadaEn(); marcar(); } }, ui.icono('x', 'i-sm'))));
      } else if (ticketOrigen) {
        basadaEn.append(h('span', { class: 'chip-activo' }, ui.icono('ticket', 'i-sm'), 'Copiada de la resolución del ticket #' + ticketOrigen));
      }
    }
    pintarBasadaEn();

    const resumen = h('div');
    const tituloPagina = h('h1', { id: 'titulo-pagina', tabindex: '-1' });

    // ------------------------------------------------------- Secciones ---
    const segModo = esOperador && !b ? h('fieldset', { class: 'modo-registro' },
      h('legend', null, '¿Cómo queda el ticket?'),
      ui.segmentado({
        nombre: 'modo',
        valor: modo,
        opciones: [
          { valor: 'nuevo', texto: 'Abierto', detalle: 'Tarea en curso, pendiente de resolución', icono: 'circulo' },
          { valor: 'resuelto', texto: 'Cerrado', detalle: 'La tarea se solucionó durante la llamada', icono: 'checkCirculo' },
        ],
        onChange: (v) => cambiarModo(v),
      })) : null;

    const cardDatos = h('section', { class: 'card pila', 'aria-labelledby': 'sec-datos' },
      h('h2', { id: 'sec-datos' }, 'Datos del ticket'),
      h('div', { class: 'grid-2' },
        ui.campo({ nombre: 'localidadId', id: 't-localidad', etiqueta: 'Localidad', requerido: esOperador, control: selLocalidad }),
        ui.campo({ nombre: 'sistemaId', id: 't-sistema', etiqueta: 'Sistema o servicio afectado', requerido: true, control: selSistema })),
      h('div', { class: 'grid-2' },
        ui.campo({ nombre: 'subsistemaId', id: 't-subsistema', etiqueta: 'Subsistema', opcional: true, control: selSub }),
        esOperador ? ui.campo({ nombre: 'tipoProblemaId', id: 't-tipo-problema', etiqueta: 'Tipo de problema', opcional: true, control: selTipoProblema }) : h('div')),
      ui.grupo({ nombre: 'tipoSolicitudId', etiqueta: 'Tipo de solicitud', requerido: true, control: segTipo }),
      ui.grupo({ nombre: 'criticidadId', etiqueta: 'Criticidad', requerido: true, control: segCri }));

    const cardProblema = h('section', { class: 'card pila', 'aria-labelledby': 'sec-problema' },
      h('h2', { id: 'sec-problema' }, 'Problema'),
      ui.campo({ nombre: 'titulo', id: 't-titulo', etiqueta: 'Título', requerido: true, control: inTitulo }),
      ui.campo({ nombre: 'descripcion', id: 't-descripcion', etiqueta: 'Descripción del problema', requerido: true, control: inDesc }),
      h('div', { class: 'campo' }, h('span', { class: 'etiqueta' }, 'Imágenes ', h('span', { class: 'opcional' }, '(opcional)')), imagenes.el));

    const cardSolucion = h('section', { class: 'card acento-dorado pila', 'aria-labelledby': 'sec-solucion', hidden: modo !== 'resuelto' },
      h('div', { class: 'fila-entre' }, h('h2', { id: 'sec-solucion' }, 'Resolución')),
      basadaEn,
      ui.campo({ nombre: 'solucionTexto', id: 't-solucion', etiqueta: 'Qué se hizo', requerido: true, control: inSolucion }),
      h('div', { class: 'campo' }, h('span', { class: 'etiqueta' }, 'Imágenes de la resolución ', h('span', { class: 'opcional' }, '(opcional)')), imgSolucion.el),
      h('div', { class: 'pila-sm' },
        h('label', { class: 'check', for: 't-proponer' }, chkProponer, h('strong', null, 'Proponer como solución reutilizable'))),
      bloqueProponer);

    const btnCrear = h('button', { type: 'submit', class: 'btn btn-primario btn-lg' });
    const btnBorrador = esOperador ? h('button', { type: 'button', class: 'btn btn-neutro btn-lg', onClick: guardarBorrador }, ui.icono('borrador', 'i-sm'), 'Guardar borrador') : null;
    const btnDescartar = b ? h('button', { type: 'button', class: 'btn btn-peligro', onClick: descartar }, ui.icono('basura', 'i-sm'), 'Descartar borrador') : null;
    const acciones = h('div', { class: 'fila' },
      btnCrear, btnBorrador,
      h('a', { class: 'btn btn-fantasma btn-lg', href: b ? '#/borradores' : '#/' }, 'Cancelar'),
      btnDescartar && h('span', { class: 'crecer' }), btnDescartar);

    const form = h('form', { class: 'pila-lg', novalidate: true, 'aria-labelledby': 'titulo-pagina' },
      resumen, segModo, cardProblema, cardDatos, cardSolucion, acciones);
    form.addEventListener('input', marcar);
    // Elegir Abierto o Cerrado no cuenta como un cambio sin guardar.
    form.addEventListener('change', (e) => { if (e.target.name !== 'modo') marcar(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); crear(); });

    // ----------------------------------------------------- Sugerencias ---
    const listaSug = h('div', { class: 'sugerencias lista-scroll' });
    const estadoSug = h('p', { class: 'chico suave', 'aria-live': 'polite' });
    function actualizarSugerencias() {
      const texto = inTitulo.value + ' ' + inDesc.value;
      const res = App.sugerencias.buscar({ texto, sistemaId: selSistema.value, subsistemaId: selSub.value, localidadId: esOperador ? selLocalidad.value : u.localidadId });
      U.vaciar(listaSug);
      if (!texto.trim() && !selSistema.value) {
        estadoSug.textContent = 'Escribí el problema para ver soluciones parecidas.';
        return;
      }
      if (!res.length) {
        estadoSug.textContent = 'Sin coincidencias.';
        return;
      }
      estadoSug.textContent = U.plural(res.length, 'sugerencia', 'sugerencias');
      res.forEach((r, i) => listaSug.append(ui.tarjetaSugerencia(r, { mejor: i === 0, alUsar: usarSolucion })));
    }
    const actualizarDiferido = U.debounce(actualizarSugerencias, 250);
    [inTitulo, inDesc].forEach((el) => el.addEventListener('input', actualizarDiferido));
    [selSistema, selSub, selLocalidad].forEach((el) => el.addEventListener('change', actualizarSugerencias));

    async function usarSolucion(r) {
      const actual = inSolucion.value.trim();
      if (actual && actual !== r.texto.trim()) {
        const ok = await ui.confirmar({ titulo: 'Reemplazar la resolución', mensaje: 'Ya escribiste una resolución. ¿La reemplazás por la de la sugerencia?', textoConfirmar: 'Reemplazar' });
        if (!ok) return;
      }
      ui.cerrarModales();
      if (modo !== 'resuelto') {
        cambiarModo('resuelto');
        const radio = form.querySelector('input[name="modo"][value="resuelto"]');
        if (radio) radio.checked = true;
        ui.toast('El ticket pasó a Cerrado. Revisá la resolución antes de crearlo.', { tipo: 'aviso' });
      }
      inSolucion.value = r.texto;
      solucionCatalogoId = r.tipo === 'catalogo' ? r.id : r.solucionCatalogoId || null;
      ticketOrigen = r.tipo === 'ticket' ? r.ticket.numero : null;
      pintarBasadaEn();
      marcar();
      cardSolucion.scrollIntoView({ behavior: 'smooth', block: 'start' });
      inSolucion.focus({ preventScroll: true });
    }

    function cambiarModo(v) {
      modo = v;
      const elegido = modo !== null;
      [cardProblema, cardDatos, acciones].forEach((el) => { el.hidden = !elegido; });
      cardSolucion.hidden = modo !== 'resuelto';
      if (btnBorrador) btnBorrador.hidden = modo === 'resuelto';
      U.vaciar(btnCrear).append(ui.icono(modo === 'resuelto' ? 'checkCirculo' : 'enviar', 'i-sm'), modo === 'resuelto' ? 'Crear ticket cerrado' : 'Crear ticket');
      tituloPagina.textContent = b ? 'Continuar borrador' : 'Crear ticket';
      ctx.titulo(tituloPagina.textContent);
      if (!b && esOperador && elegido) App.router.actualizarQuery(modo === 'resuelto' ? { modo: 'resuelto' } : {});
    }

    // ----------------------------------------------------------- Acciones ---
    function leer() {
      return {
        localidadId: esOperador ? selLocalidad.value : u.localidadId,
        sistemaId: selSistema.value,
        subsistemaId: selSub.value,
        tipoSolicitudId: ui.valorRadio(form, 'tipoSolicitud'),
        criticidadId: ui.valorRadio(form, 'criticidad'),
        tipoProblemaId: selTipoProblema ? selTipoProblema.value : null,
        titulo: inTitulo.value,
        descripcion: inDesc.value,
        adjuntos: imagenes.valor(),
      };
    }

    function crear() {
      const opciones = { borradorId: b ? b.id : null };
      if (modo === 'resuelto') {
        Object.assign(opciones, {
          registroDirecto: true,
          solucionTexto: inSolucion.value,
          solucionAdjuntos: imgSolucion.valor(),
          solucionCatalogoId,
          proponer: chkProponer.checked ? { titulo: inPropTitulo.value, palabrasClave: palabras.valor() } : null,
        });
      }
      try {
        const t = S.crearTicket(leer(), u, opciones);
        ctx.marcarSucio(false);
        const prop = modo === 'resuelto' && chkProponer.checked ? ' Solución reutilizable propuesta: queda por aprobar.' : '';
        ui.toast((modo === 'resuelto' ? 'Ticket #' + t.numero + ' registrado como cerrado.' : 'Ticket #' + t.numero + ' creado. Queda En proceso, a tu nombre.') + prop);
        App.router.ir('/tickets/' + t.numero);
      } catch (e) {
        if (e.campos) ui.mostrarErrores(form, e.campos, resumen);
        else ui.mostrarError(e);
      }
    }

    function guardarBorrador() {
      try {
        const nuevo = S.guardarBorrador(leer(), u, b ? b.id : null);
        ctx.marcarSucio(false);
        ui.limpiarErrores(form);
        ui.toast('Borrador guardado.');
        if (!b) App.router.ir('/borradores/' + nuevo.id, { reemplazar: true });
        else ctx.refrescar();
      } catch (e) {
        if (e.campos) ui.mostrarErrores(form, e.campos, resumen);
        else ui.mostrarError(e);
      }
    }

    async function descartar() {
      const ok = await ui.confirmar({ titulo: 'Descartar el borrador', mensaje: 'Se borra el borrador y lo que tenga cargado. No se puede deshacer.', textoConfirmar: 'Descartar', peligro: true });
      if (!ok) return;
      try {
        S.descartarBorrador(b.id, u);
        ctx.marcarSucio(false);
        ui.toast('Borrador descartado.');
        App.router.ir('/borradores');
      } catch (e) { ui.mostrarError(e); }
    }

    // --------------------------------------------------------- Columnas ---
    const lateral = esOperador
      ? h('aside', { class: 'panel-sugerencias', 'aria-labelledby': 'sec-sugerencias' },
        h('section', { class: 'card pila' },
          h('div', { class: 'fila-entre' },
            h('h2', { id: 'sec-sugerencias', class: 'fila-sm' }, ui.icono('bombilla'), 'Sugerencias'),
            estadoSug),
          listaSug))
      : null;

    const encabezado = h('div', { class: 'cabecera' },
      h('div', { class: 'titulos' },
        h('nav', { class: 'migas', 'aria-label': 'Ubicación' },
          b ? [h('a', { href: '#/borradores' }, 'Borradores'), ui.icono('derecha', 'i-sm'), h('span', { 'aria-current': 'page' }, 'Continuar')]
            : [h('a', { href: '#/tickets' }, 'Tickets'), ui.icono('derecha', 'i-sm'), h('span', { 'aria-current': 'page' }, 'Crear')]),
        tituloPagina),
      b ? h('span', { class: 'badge contorno grande' }, ui.icono('borrador', 'i-sm'), 'Borrador · guardado ', ui.tiempo(b.actualizadoEn)) : null);

    cambiarModo(modo);
    if (pre.usar && modo === 'resuelto') {
      inSolucion.value = pre.usar.texto;
      solucionCatalogoId = pre.usar.solucionCatalogoId || null;
      ticketOrigen = pre.usar.ticketNumero || null;
      pintarBasadaEn();
    }
    // Lo que llega desde la búsqueda ya es trabajo del operador: avisar antes de perderlo.
    if (pre.descripcion || pre.titulo || pre.usar) marcar();
    setTimeout(actualizarSugerencias, 0);

    const contenido = [
      encabezado,
      esOperador ? h('div', { class: 'dos-columnas-anchas' }, form, lateral) : h('div', { class: 'columna-unica' }, form),
    ];
    return h('div', { class: 'pila' }, contenido);
  }

  /**
   * Admite datos iniciales en la dirección (los usa la búsqueda de soluciones):
   * ?descripcion=…&titulo=…&sis=…&sub=…&loc=…&modo=resuelto&usar=catalogo:<id>|ticket:<id>
   */
  App.vistas.ticketNuevo = function (ctx) {
    const S = App.store;
    const q = ctx.query;
    const pre = { titulo: q.titulo || '', descripcion: q.descripcion || '', sistemaId: q.sis || '', subsistemaId: q.sub || '', localidadId: q.loc || '' };
    let modoInicial = q.modo;
    if (q.usar && ctx.usuario.rol === 'OPERADOR') {
      const i = q.usar.indexOf(':');
      const tipo = q.usar.slice(0, i);
      const id = q.usar.slice(i + 1);
      if (tipo === 'catalogo') {
        const s = S.solucion(id);
        if (s && s.estado === 'APROBADA') {
          pre.usar = { texto: s.descripcion, solucionCatalogoId: s.id };
          if (!pre.sistemaId && s.sistemaId) { pre.sistemaId = s.sistemaId; pre.subsistemaId = s.subsistemaId || ''; }
        }
      } else if (tipo === 'ticket') {
        const t = S.ticket(id);
        if (t && t.estado === 'CERRADO' && t.solucion) {
          const cat = t.solucion.solucionCatalogoId ? S.solucion(t.solucion.solucionCatalogoId) : null;
          pre.usar = { texto: t.solucion.texto, solucionCatalogoId: cat && cat.estado === 'APROBADA' ? cat.id : null, ticketNumero: t.numero };
          if (!pre.sistemaId) { pre.sistemaId = t.sistemaId; pre.subsistemaId = t.subsistemaId || ''; }
        }
      }
      if (pre.usar) modoInicial = 'resuelto';
      else App.ui.toast('La solución o resolución elegida ya no está disponible.', { tipo: 'aviso' });
    }
    return formularioTicket(ctx, { modoInicial, prefill: pre });
  };

  App.vistas.borrador = function (ctx) {
    const b = App.store.borradorParaUsuario(ctx.params.id, ctx.usuario);
    if (!b) {
      return h('div', { class: 'card' }, h('h1', { id: 'titulo-pagina', tabindex: '-1', class: 'sr-only' }, 'Borrador no encontrado'), App.ui.vacio({
        icono: 'borrador',
        titulo: 'No encontramos el borrador',
        accion: h('a', { class: 'btn btn-primario', href: '#/borradores' }, 'Ver mis borradores'),
      }));
    }
    return formularioTicket(ctx, { borrador: b });
  };
})(window.App = window.App || {});
