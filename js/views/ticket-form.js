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
    // ORMEN (operador o administrador) elige la localidad; el cliente usa la suya.
    const eligeLocalidad = u.rol !== 'CLIENTE';
    const b = op.borrador || null;
    const pre = op.prefill || {}; // datos que llegan desde la búsqueda de soluciones
    // ORMEN elige si el ticket queda Cerrado ('resuelto', lo más común: se resolvió en la llamada)
    // o Pendiente ('nuevo'). El cliente no elige: su ticket siempre queda Abierto.
    const esCliente = u.rol === 'CLIENTE';
    let modo = b || esCliente || op.modoInicial === 'nuevo' ? 'nuevo' : 'resuelto';
    let solucionCatalogoId = null;
    let ticketOrigen = null; // número del ticket del que se copió la solución (sólo informativo)
    const marcar = () => ctx.marcarSucio(true);

    // ------------------------------------------------------- Controles ---
    const selLocalidad = eligeLocalidad
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

    const segCri = ui.segmentado({ nombre: 'criticidad', valor: b ? b.criticidadId : '', opciones: S.catalogo('criticidades', true).map((c) => ({ valor: c.id, texto: c.nombre, punto: c.clase })) });
    const selTipoProblema = esOperador ? ui.select({ id: 't-tipo-problema', valor: (b && b.tipoProblemaId) || 'tp-nodef', opciones: S.catalogo('tiposProblema', true).map((x) => ({ valor: x.id, texto: x.nombre })) }) : null;
    const inTitulo = h('input', { id: 't-titulo', class: 'control', type: 'text', maxlength: '120', autocomplete: 'off', value: b ? b.titulo : pre.titulo || '', placeholder: 'Por ejemplo: la impresora de la terminal no imprime' });
    // Las imágenes se pegan dentro del texto, como en el sistema actual (sin botón de adjuntar).
    const editorDesc = ui.editorTexto({
      id: 't-descripcion', filas: 6, etiqueta: 'Descripción del problema',
      valor: b ? b.descripcion : pre.descripcion || '', adjuntos: b ? b.adjuntos : [],
      placeholder: (esOperador ? 'Qué cuenta la agencia: qué pasa, desde cuándo, qué mensaje aparece…' : 'Contanos qué pasa, desde cuándo y qué mensaje aparece en pantalla.') + ' Podés pegar capturas acá mismo.',
    });
    const inDesc = editorDesc.el;

    // Si se resolvió en la llamada, la resolución también va en la descripción (no hay sección aparte).
    const ayudaDesc = h('p', { class: 'chico suave' });
    const basadaEn = h('div', { class: 'fila-sm' });

    function pintarBasadaEn() {
      U.vaciar(basadaEn);
      if (solucionCatalogoId) {
        const s = S.solucion(solucionCatalogoId);
        basadaEn.append(h('span', { class: 'chip-activo' }, ui.icono('libro', 'i-sm'), 'Basada en la solución reutilizable «' + (s ? s.titulo : '') + '»',
          h('button', { type: 'button', 'aria-label': 'Quitar la referencia a la solución reutilizable', onClick: () => { solucionCatalogoId = null; pintarBasadaEn(); marcar(); } }, ui.icono('x', 'i-sm'))));
      } else if (ticketOrigen) {
        basadaEn.append(h('span', { class: 'chip-activo' }, ui.icono('ticket', 'i-sm'), 'Se agregó la resolución del ticket #' + ticketOrigen));
      }
    }
    pintarBasadaEn();

    const resumen = h('div');
    const tituloPagina = h('h1', { id: 'titulo-pagina', tabindex: '-1' });

    // ------------------------------------------------------- Secciones ---
    // Cerrado va primero y como opción principal; Pendiente, del mismo tamaño, como secundaria.
    // El cliente ve el estado con el que queda su ticket, sin poder cambiarlo.
    const chkPrivado = esCliente ? null : h('input', { type: 'checkbox', id: 't-privado' });
    const segModo = b ? null : esCliente
      ? h('div', { class: 'modo-fijo' },
        h('strong', null, 'Abierto'), h('span', null, 'Mesa de ayuda lo va a tomar y te avisamos por correo cuando haya novedades.'))
      : h('fieldset', { class: 'modo-registro modo-ormen' },
        h('legend', { class: 'sr-only' }, '¿Cómo queda el ticket?'),
        ui.segmentado({
          nombre: 'modo',
          valor: modo,
          opciones: [
            { valor: 'resuelto', texto: 'Cerrado', detalle: 'Se resolvió durante la llamada', icono: 'checkCirculo' },
            { valor: 'nuevo', texto: 'Pendiente', detalle: 'Todavía no está resuelto', icono: 'reloj' },
          ],
          onChange: (v) => cambiarModo(v),
        }));

    const cardDatos = h('section', { class: 'hoja-seccion pila', 'aria-labelledby': 'sec-datos' },
      h('h2', { id: 'sec-datos' }, 'Datos del ticket'),
      h('div', { class: 'grid-2' },
        ui.campo({ nombre: 'localidadId', id: 't-localidad', etiqueta: 'Localidad', requerido: eligeLocalidad, control: selLocalidad }),
        ui.campo({ nombre: 'sistemaId', id: 't-sistema', etiqueta: 'Sistema o servicio afectado', requerido: true, control: selSistema })),
      h('div', { class: 'grid-2' },
        ui.campo({ nombre: 'subsistemaId', id: 't-subsistema', etiqueta: 'Subsistema', opcional: true, control: selSub }),
        esOperador ? ui.campo({ nombre: 'tipoProblemaId', id: 't-tipo-problema', etiqueta: 'Tipo de problema', opcional: true, control: selTipoProblema }) : h('div')),
      ui.grupo({ nombre: 'criticidadId', etiqueta: 'Criticidad', requerido: true, control: segCri }),
      esCliente ? null : h('label', { class: 'check check-privado', for: 't-privado' }, chkPrivado,
        h('span', null, h('strong', null, 'Ticket privado'), h('br'), h('span', { class: 'chico suave' }, 'Sólo lo ven Mesa de ayuda y administración. La localidad no se entera de que existe.'))));

    const cardProblema = h('section', { class: 'hoja-seccion pila', 'aria-labelledby': 'sec-problema' },
      h('h2', { id: 'sec-problema' }, 'Problema'),
      ui.campo({ nombre: 'titulo', id: 't-titulo', etiqueta: 'Título', requerido: true, control: inTitulo }),
      ui.campo({ nombre: 'descripcion', id: 't-descripcion', etiqueta: 'Descripción', requerido: true, control: inDesc }),
      ayudaDesc,
      basadaEn);

    const btnCrear = h('button', { type: 'submit', class: 'btn btn-primario btn-lg' });
    const btnBorrador = esOperador ? h('button', { type: 'button', class: 'btn btn-neutro btn-lg', onClick: guardarBorrador }, ui.icono('borrador', 'i-sm'), 'Guardar borrador') : null;
    const btnDescartar = b ? h('button', { type: 'button', class: 'btn btn-peligro', onClick: descartar }, ui.icono('basura', 'i-sm'), 'Descartar borrador') : null;
    const acciones = h('div', { class: 'barra-form' },
      btnCrear, btnBorrador,
      h('a', { class: 'btn btn-fantasma btn-lg', href: b ? '#/borradores' : '#/' }, 'Cancelar'),
      btnDescartar && h('span', { class: 'crecer' }), btnDescartar);

    // El formulario se ve desde el principio: el modo siempre tiene un valor.
    // Primero los datos del ticket (localidad, sistema, criticidad) y después el problema.
    const hojaForm = h('div', { class: 'hoja' }, cardDatos, cardProblema, acciones);
    const form = h('form', { class: 'pila-lg', novalidate: true, 'aria-labelledby': 'titulo-pagina' },
      resumen, segModo, hojaForm);
    // Elegir Cerrado o Pendiente no cuenta como un cambio sin guardar.
    const marcarSalvoModo = (e) => { if (e.target.name !== 'modo') marcar(); };
    form.addEventListener('input', marcarSalvoModo);
    form.addEventListener('change', marcarSalvoModo);
    form.addEventListener('submit', (e) => { e.preventDefault(); crear(); });

    // ----------------------------------------------------- Sugerencias ---
    const listaSug = h('div', { class: 'sugerencias lista-scroll' });
    const estadoSug = h('p', { class: 'chico suave', 'aria-live': 'polite' });
    function actualizarSugerencias() {
      const texto = inTitulo.value + ' ' + editorDesc.textoPlano();
      const res = App.sugerencias.buscar({ texto, sistemaId: selSistema.value, subsistemaId: selSub.value, localidadId: eligeLocalidad ? selLocalidad.value : u.localidadId });
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
      res.forEach((r) => listaSug.append(ui.tarjetaSugerencia(r, { alUsar: usarSolucion, textoUsar: 'Agregar a la descripción' })));
    }
    const actualizarDiferido = U.debounce(actualizarSugerencias, 250);
    [inTitulo, inDesc].forEach((el) => el.addEventListener('input', actualizarDiferido));
    [selSistema, selSub, selLocalidad].forEach((el) => el.addEventListener('change', actualizarSugerencias));

    /** Agrega la resolución sugerida al final de la descripción, con sus imágenes. */
    function agregarADescripcion(texto, adjuntos) {
      const actual = editorDesc.valor();
      const junto = actual.texto.trim() ? actual.texto.replace(/\s+$/, '') + '\n\nResolución:\n' + texto : texto;
      editorDesc.cargar(junto, actual.adjuntos.concat(adjuntos || []));
    }

    function usarSolucion(r) {
      ui.cerrarModales();
      if (modo !== 'resuelto') {
        cambiarModo('resuelto');
        const radio = form.querySelector('input[name="modo"][value="resuelto"]');
        if (radio) radio.checked = true;
        ui.toast('El ticket pasó a Cerrado. Revisá la descripción antes de crearlo.', { tipo: 'aviso' });
      }
      agregarADescripcion(r.texto, r.adjuntos);
      solucionCatalogoId = r.tipo === 'catalogo' ? r.id : r.solucionCatalogoId || null;
      ticketOrigen = r.tipo === 'ticket' ? r.ticket.numero : null;
      pintarBasadaEn();
      marcar();
      inDesc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      editorDesc.area.focus({ preventScroll: true });
    }

    function cambiarModo(v) {
      modo = v;
      const elegido = modo !== null;
      hojaForm.hidden = !elegido;
      // Las sugerencias aparecen junto con el formulario, no antes.
      if (lateral) {
        lateral.hidden = !elegido;
        columnas.className = elegido ? 'dos-columnas-anchas' : 'columna-unica';
      }
      ayudaDesc.textContent = 'Contá el problema y qué se hizo para resolverlo, todo en el mismo texto.';
      ayudaDesc.hidden = modo !== 'resuelto';
      if (btnBorrador) btnBorrador.hidden = modo === 'resuelto';
      U.vaciar(btnCrear).append(ui.icono(modo === 'resuelto' ? 'checkCirculo' : 'enviar', 'i-sm'), modo === 'resuelto' ? 'Crear ticket cerrado' : 'Crear ticket');
      tituloPagina.textContent = b ? 'Continuar borrador' : 'Crear ticket';
      ctx.titulo(tituloPagina.textContent);
      if (!b && !esCliente) App.router.actualizarQuery(modo === 'nuevo' ? { modo: 'pendiente' } : {});
    }

    // ----------------------------------------------------------- Acciones ---
    function leer() {
      return {
        localidadId: eligeLocalidad ? selLocalidad.value : u.localidadId,
        sistemaId: selSistema.value,
        subsistemaId: selSub.value,
        criticidadId: ui.valorRadio(form, 'criticidad'),
        tipoProblemaId: selTipoProblema ? selTipoProblema.value : null,
        titulo: inTitulo.value,
        descripcion: editorDesc.valor().texto,
        adjuntos: editorDesc.valor().adjuntos,
      };
    }

    function crear() {
      const opciones = { borradorId: b ? b.id : null, privado: !!(chkPrivado && chkPrivado.checked) };
      if (modo === 'resuelto') {
        Object.assign(opciones, {
          registroDirecto: true,
          solucionCatalogoId,
        });
      }
      try {
        const t = S.crearTicket(leer(), u, opciones);
        ctx.marcarSucio(false);
        ui.toast(modo === 'resuelto' ? 'Ticket #' + t.numero + ' registrado como cerrado.' : 'Ticket #' + t.numero + ' creado.' + (esOperador ? ' Queda En proceso, a tu nombre.' : ''));
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
            : [h('a', { href: esCliente ? '#/' : '#/tickets' }, esCliente ? 'Inicio' : 'Tickets'), ui.icono('derecha', 'i-sm'), h('span', { 'aria-current': 'page' }, 'Crear')]),
        tituloPagina),
      b ? h('span', { class: 'badge contorno grande' }, ui.icono('borrador', 'i-sm'), 'Borrador · guardado ', ui.tiempo(b.actualizadoEn)) : null);

    const columnas = h('div', { class: lateral ? 'dos-columnas-anchas' : 'columna-unica' }, form, lateral);
    cambiarModo(modo);
    if (pre.usar && modo === 'resuelto') {
      agregarADescripcion(pre.usar.texto, pre.usar.adjuntos || []);
      solucionCatalogoId = pre.usar.solucionCatalogoId || null;
      ticketOrigen = pre.usar.ticketNumero || null;
      pintarBasadaEn();
    }
    // Lo que llega desde la búsqueda ya es trabajo del operador: avisar antes de perderlo.
    if (pre.descripcion || pre.titulo || pre.usar) marcar();
    setTimeout(actualizarSugerencias, 0);

    const contenido = [
      encabezado,
      columnas,
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
    // Sin modo en la dirección, ORMEN arranca en Cerrado; ?modo=pendiente abre Pendiente.
    let modoInicial = q.modo === 'pendiente' ? 'nuevo' : 'resuelto';
    if (q.usar && ctx.usuario.rol === 'OPERADOR') {
      const i = q.usar.indexOf(':');
      const tipo = q.usar.slice(0, i);
      const id = q.usar.slice(i + 1);
      if (tipo === 'catalogo') {
        const s = S.solucion(id);
        if (s && s.estado === 'APROBADA') {
          pre.usar = { texto: s.descripcion, adjuntos: s.adjuntos || [], solucionCatalogoId: s.id };
          if (!pre.sistemaId && s.sistemaId) { pre.sistemaId = s.sistemaId; pre.subsistemaId = s.subsistemaId || ''; }
        }
      } else if (tipo === 'ticket') {
        const t = S.ticket(id);
        if (t && t.estado === 'CERRADO' && t.solucion) {
          const cat = t.solucion.solucionCatalogoId ? S.solucion(t.solucion.solucionCatalogoId) : null;
          pre.usar = { texto: t.solucion.texto, adjuntos: S.adjuntosSolucion(t), solucionCatalogoId: cat && cat.estado === 'APROBADA' ? cat.id : null, ticketNumero: t.numero };
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
