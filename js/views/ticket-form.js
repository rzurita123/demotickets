/* ==========================================================================
   Alta de tickets.
   - Cliente (HU02): su localidad queda fija.
   - Operador (HU01): elige la localidad, ve sugerencias de solución
     mientras escribe (HU03), puede guardar un borrador (HU14/HU15) o
     registrar el ticket ya resuelto ("Ya lo resolví", a analizar con ORMEN).
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
    let modo = esOperador && op.modoInicial === 'resuelto' && !b ? 'resuelto' : 'nuevo';
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
      subs.forEach((x) => selSub.append(h('option', { value: x.id }, x.nombre + (x.ejemplo ? ' (ejemplo)' : ''))));
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

    // Solución (modo "Ya lo resolví")
    const inSolucion = h('textarea', { id: 't-solucion', class: 'control', rows: '5', placeholder: 'Qué se hizo para resolverlo, paso a paso.' });
    const basadaEn = h('div', { class: 'fila-sm' });
    const imgSolucion = ui.selectorImagenes({ pegarEn: [inSolucion], etiqueta: 'Imágenes de la solución', alCambiar: marcar });
    const chkProponer = h('input', { type: 'checkbox', id: 't-proponer' });
    const inPropTitulo = h('input', { id: 't-prop-titulo', class: 'control', type: 'text', maxlength: '120' });
    const palabras = ui.entradaPalabras({ id: 't-prop-palabras', alCambiar: marcar });
    const ayudaProponer = h('span', { class: 'ayuda' });
    const bloqueProponer = h('div', { class: 'pila', hidden: true },
      ui.campo({ nombre: 'propuestaTitulo', id: 't-prop-titulo', etiqueta: 'Título para el catálogo', requerido: true, control: inPropTitulo }),
      ui.campo({ nombre: 'propuestaPalabras', id: 't-prop-palabras', etiqueta: 'Palabras clave', requerido: true, control: palabras.el, ayuda: 'Se usan para sugerir la solución cuando aparecen en la descripción de un ticket nuevo.' }));
    chkProponer.addEventListener('change', () => {
      bloqueProponer.hidden = !chkProponer.checked;
      if (chkProponer.checked && !inPropTitulo.value.trim()) inPropTitulo.value = inTitulo.value.trim();
    });

    function pintarBasadaEn() {
      U.vaciar(basadaEn);
      chkProponer.disabled = !!solucionCatalogoId;
      ayudaProponer.textContent = solucionCatalogoId
        ? 'La solución ya viene del catálogo, no hace falta proponerla.'
        : 'Queda pendiente hasta que un administrador la apruebe.';
      if (solucionCatalogoId) {
        chkProponer.checked = false;
        bloqueProponer.hidden = true;
        const s = S.solucion(solucionCatalogoId);
        basadaEn.append(h('span', { class: 'chip-activo' }, ui.icono('libro', 'i-sm'), 'Basada en el catálogo: «' + (s ? s.titulo : '') + '»',
          h('button', { type: 'button', 'aria-label': 'Quitar la referencia al catálogo', onClick: () => { solucionCatalogoId = null; pintarBasadaEn(); marcar(); } }, ui.icono('x', 'i-sm'))));
      } else if (ticketOrigen) {
        basadaEn.append(h('span', { class: 'chip-activo' }, ui.icono('ticket', 'i-sm'), 'Copiada del ticket #' + ticketOrigen));
      }
    }
    pintarBasadaEn();

    const resumen = h('div');
    const tituloPagina = h('h1', { id: 'titulo-pagina', tabindex: '-1' });
    const subtituloPagina = h('p', { class: 'subtitulo' });

    // ------------------------------------------------------- Secciones ---
    const avisoResuelto = ui.avisoPendiente('Registro directo como Cerrado',
      'ORMEN registra hoy tickets ya resueltos, pero cómo va a funcionar en el sistema nuevo quedó a analizar en conjunto. En la demo, el ticket se guarda directamente como Cerrado con su solución.');

    const segModo = esOperador && !b ? h('fieldset', { class: 'card compacta' },
      h('legend', { class: 'sr-only' }, '¿Cómo lo registrás?'),
      h('div', { class: 'fila-entre' },
        h('span', { class: 'fuerte' }, '¿Cómo lo registrás?'),
        ui.segmentado({
          nombre: 'modo',
          valor: modo,
          opciones: [
            { valor: 'nuevo', texto: 'Ticket nuevo (queda Abierto)', icono: 'ticket' },
            { valor: 'resuelto', texto: 'Ya lo resolví (queda Cerrado)', icono: 'checkCirculo' },
          ],
          onChange: (v) => cambiarModo(v),
        }))) : null;

    const cardDatos = h('section', { class: 'card pila', 'aria-labelledby': 'sec-datos' },
      h('h2', { id: 'sec-datos' }, 'Datos del ticket'),
      h('div', { class: 'grid-2' },
        ui.campo({ nombre: 'localidadId', id: 't-localidad', etiqueta: 'Localidad', requerido: esOperador, control: selLocalidad, ayuda: esOperador ? 'La banca o agencia afectada. El ticket lo ve esa localidad.' : 'Tu usuario pertenece a esta localidad.' }),
        ui.campo({ nombre: 'sistemaId', id: 't-sistema', etiqueta: 'Sistema o servicio afectado', requerido: true, control: selSistema })),
      h('div', { class: 'grid-2' },
        ui.campo({ nombre: 'subsistemaId', id: 't-subsistema', etiqueta: 'Subsistema', opcional: true, control: selSub, ayuda: 'Si corresponde. Los marcados como «ejemplo» son de muestra: faltan los subsistemas reales de ORMEN.' }),
        esOperador ? ui.campo({ nombre: 'tipoProblemaId', id: 't-tipo-problema', etiqueta: 'Tipo de problema', opcional: true, control: selTipoProblema }) : h('div')),
      ui.grupo({ nombre: 'tipoSolicitudId', etiqueta: 'Tipo de solicitud', requerido: true, control: segTipo }),
      ui.grupo({ nombre: 'criticidadId', etiqueta: 'Criticidad', requerido: true, control: segCri, extraEtiqueta: ui.pendiente('Valores de ejemplo', 'ORMEN todavía no definió los niveles de criticidad.') }));

    const cardProblema = h('section', { class: 'card pila', 'aria-labelledby': 'sec-problema' },
      h('h2', { id: 'sec-problema' }, 'Problema'),
      ui.campo({ nombre: 'titulo', id: 't-titulo', etiqueta: 'Título', requerido: true, control: inTitulo }),
      ui.campo({ nombre: 'descripcion', id: 't-descripcion', etiqueta: 'Descripción del problema', requerido: true, control: inDesc, ayuda: 'Podés pegar capturas de pantalla directamente en este campo.' }),
      h('div', { class: 'campo' }, h('span', { class: 'etiqueta' }, 'Imágenes ', h('span', { class: 'opcional' }, '(opcional)')), imagenes.el));

    const cardSolucion = h('section', { class: 'card acento-dorado pila', 'aria-labelledby': 'sec-solucion', hidden: modo !== 'resuelto' },
      h('div', { class: 'fila-entre' }, h('h2', { id: 'sec-solucion' }, 'Solución aplicada'), ui.pendiente('A analizar con ORMEN')),
      basadaEn,
      ui.campo({ nombre: 'solucionTexto', id: 't-solucion', etiqueta: 'Qué se hizo', requerido: true, control: inSolucion, ayuda: 'Todo ticket cerrado tiene su solución. Podés partir de una de las sugerencias de solución.' }),
      h('div', { class: 'campo' }, h('span', { class: 'etiqueta' }, 'Imágenes de la solución ', h('span', { class: 'opcional' }, '(opcional)')), imgSolucion.el),
      h('div', { class: 'pila-sm' },
        h('label', { class: 'check', for: 't-proponer' }, chkProponer, h('span', null, h('strong', null, 'Proponer esta solución para el catálogo'), h('br'), ayudaProponer))),
      bloqueProponer);

    const tresCx = esOperador ? h('section', { class: 'tres-cx', 'aria-labelledby': 'sec-3cx' },
      h('div', { class: 'fila-entre' },
        h('h2', { id: 'sec-3cx', class: 'fila-sm', style: 'font-size: 16px' }, ui.icono('telefono'), 'Llamada telefónica (3CX)'),
        ui.pendiente('Pendiente con ORMEN')),
      h('p', { class: 'chico' }, 'La integración con la central 3CX está a la espera de la respuesta de ORMEN. Las dos alternativas que propuso el equipo; en ambas el operador confirma siempre el ticket:'),
      h('div', { class: 'alternativas' },
        h('div', { class: 'alt' }, h('strong', null, 'A · Transcripción como apoyo'), 'El sistema transcribe la llamada y el operador decide si adjunta la transcripción, separada de la descripción.'),
        h('div', { class: 'alt' }, h('strong', null, 'B · Transcripción y descripción sugerida con IA'), 'Como A, y además una IA propone un borrador de descripción que el operador revisa y confirma.'))) : null;

    const btnCrear = h('button', { type: 'submit', class: 'btn btn-primario btn-lg' });
    const btnBorrador = esOperador ? h('button', { type: 'button', class: 'btn btn-neutro btn-lg', onClick: guardarBorrador }, ui.icono('borrador', 'i-sm'), 'Guardar borrador') : null;
    const btnDescartar = b ? h('button', { type: 'button', class: 'btn btn-peligro', onClick: descartar }, ui.icono('basura', 'i-sm'), 'Descartar borrador') : null;
    const acciones = h('div', { class: 'fila' },
      btnCrear, btnBorrador,
      h('a', { class: 'btn btn-fantasma btn-lg', href: b ? '#/borradores' : '#/' }, 'Cancelar'),
      btnDescartar && h('span', { class: 'crecer' }), btnDescartar);

    const form = h('form', { class: 'pila-lg', novalidate: true, 'aria-labelledby': 'titulo-pagina' },
      resumen, segModo, cardDatos, cardProblema, cardSolucion, tresCx, acciones);
    form.addEventListener('input', marcar);
    form.addEventListener('change', marcar);
    form.addEventListener('submit', (e) => { e.preventDefault(); crear(); });

    // ----------------------------------------------------- Sugerencias ---
    const listaSug = h('div', { class: 'sugerencias lista-scroll' });
    const estadoSug = h('p', { class: 'chico suave', 'aria-live': 'polite' });
    function actualizarSugerencias() {
      const texto = inTitulo.value + ' ' + inDesc.value;
      const res = App.sugerencias.buscar({ texto, sistemaId: selSistema.value, subsistemaId: selSub.value, localidadId: esOperador ? selLocalidad.value : u.localidadId });
      U.vaciar(listaSug);
      if (!texto.trim() && !selSistema.value) {
        estadoSug.textContent = 'Escribí el título o la descripción, o elegí el sistema, para ver soluciones parecidas.';
        return;
      }
      if (!res.length) {
        estadoSug.textContent = 'No se encontraron soluciones relevantes. Probá con otras palabras o revisá el sistema elegido.';
        return;
      }
      estadoSug.textContent = U.plural(res.length, 'sugerencia', 'sugerencias') + ', de mayor a menor puntaje.';
      res.forEach((r, i) => listaSug.append(ui.tarjetaSugerencia(r, { mejor: i === 0, alUsar: usarSolucion })));
    }
    const actualizarDiferido = U.debounce(actualizarSugerencias, 250);
    [inTitulo, inDesc].forEach((el) => el.addEventListener('input', actualizarDiferido));
    [selSistema, selSub, selLocalidad].forEach((el) => el.addEventListener('change', actualizarSugerencias));

    async function usarSolucion(r) {
      const actual = inSolucion.value.trim();
      if (actual && actual !== r.texto.trim()) {
        const ok = await ui.confirmar({ titulo: 'Reemplazar la solución', mensaje: 'Ya escribiste una solución. ¿La reemplazás por la de la sugerencia?', textoConfirmar: 'Reemplazar' });
        if (!ok) return;
      }
      ui.cerrarModales();
      if (modo !== 'resuelto') {
        cambiarModo('resuelto');
        const radio = form.querySelector('input[name="modo"][value="resuelto"]');
        if (radio) radio.checked = true;
        ui.toast('Pasaste a «Ya lo resolví». Revisá la solución antes de registrar.', { tipo: 'aviso' });
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
      cardSolucion.hidden = modo !== 'resuelto';
      avisoResuelto.hidden = modo !== 'resuelto';
      if (btnBorrador) btnBorrador.hidden = modo === 'resuelto';
      U.vaciar(btnCrear).append(ui.icono(modo === 'resuelto' ? 'checkCirculo' : 'enviar', 'i-sm'), modo === 'resuelto' ? 'Registrar ticket cerrado' : 'Crear ticket');
      tituloPagina.textContent = b ? 'Continuar borrador' : modo === 'resuelto' ? 'Registrar ticket resuelto' : 'Nuevo ticket';
      subtituloPagina.textContent = b
        ? 'Completá los datos que falten y creá el ticket. Hasta entonces sólo lo ves vos.'
        : modo === 'resuelto'
          ? 'Para cuando lo resolviste durante la llamada y lo documentás después.'
          : esOperador ? 'Cargalo mientras hablás con la agencia: a medida que escribís aparecen soluciones parecidas.' : 'Contanos qué pasa y Mesa de ayuda lo va a atender.';
      ctx.titulo(tituloPagina.textContent);
      if (!b && esOperador) App.router.actualizarQuery(modo === 'resuelto' ? { modo: 'resuelto' } : {});
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
        const prop = modo === 'resuelto' && chkProponer.checked ? ' La solución quedó pendiente de aprobación.' : '';
        ui.toast((modo === 'resuelto' ? 'Ticket #' + t.numero + ' registrado como cerrado.' : 'Ticket #' + t.numero + ' creado. Queda Abierto.') + prop);
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
        ui.toast('Borrador guardado. Sólo lo ves vos y no cuenta en estadísticas.');
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
          h('div', { class: 'pila-sm' },
            h('h2', { id: 'sec-sugerencias', class: 'fila-sm' }, ui.icono('bombilla'), 'Sugerencias de solución'),
            h('p', { class: 'chico suave' }, 'Del catálogo y de tickets cerrados del mismo sistema o la misma localidad. Puntaje: mismo sistema y subsistema + palabras clave. ', ui.pendiente('Puntos provisorios', 'ORMEN explicó los criterios pero no cuántos puntos vale cada uno.')),
            estadoSug),
          listaSug))
      : h('aside', { class: 'pila' },
        h('section', { class: 'card pila', 'aria-labelledby': 'sec-como-sigue' },
          h('h2', { id: 'sec-como-sigue' }, 'Cómo sigue'),
          h('ol', { class: 'pila-sm', style: 'margin: 0; padding-left: 20px' },
            h('li', null, 'El ticket queda ', h('strong', null, 'Abierto'), ' y lo ve todo tu equipo de ', S.nombre('localidades', u.localidadId), '.'),
            h('li', null, 'Mesa de ayuda lo atiende y responde en el ticket.'),
            h('li', null, 'Si necesitan algo de ustedes, pasa a ', h('strong', null, 'Pendiente'), '.'),
            h('li', null, 'Cuando se resuelve, queda ', h('strong', null, 'Cerrado'), '.')),
          h('p', { class: 'chico suave' }, 'Cada vez que Mesa de ayuda lo actualiza te llega un aviso por correo (en la demo, en «Correos simulados»). ORMEN lo marcó como deseable.')));

    const encabezado = h('div', { class: 'cabecera' },
      h('div', { class: 'titulos' },
        h('nav', { class: 'migas', 'aria-label': 'Ubicación' },
          b ? [h('a', { href: '#/borradores' }, 'Borradores'), ui.icono('derecha', 'i-sm'), h('span', { 'aria-current': 'page' }, 'Continuar')]
            : [h('a', { href: '#/tickets' }, 'Tickets'), ui.icono('derecha', 'i-sm'), h('span', { 'aria-current': 'page' }, 'Nuevo')]),
        h('span', { class: 'antetitulo' }, esOperador ? 'Mesa de ayuda' : S.nombre('localidades', u.localidadId)),
        tituloPagina,
        subtituloPagina));

    cambiarModo(modo);
    avisoResuelto.hidden = modo !== 'resuelto';
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
      b ? ui.aviso(['Borrador guardado ', ui.tiempo(b.actualizadoEn), '. Sólo lo ves vos, no es visible para la localidad y no cuenta en estadísticas.'], null, 'borrador') : null,
      avisoResuelto,
      h('div', { class: esOperador ? 'dos-columnas-anchas' : 'dos-columnas' }, form, lateral),
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
      else App.ui.toast('La solución elegida ya no está disponible.', { tipo: 'aviso' });
    }
    return formularioTicket(ctx, { modoInicial, prefill: pre });
  };

  App.vistas.borrador = function (ctx) {
    const b = App.store.borradorParaUsuario(ctx.params.id, ctx.usuario);
    if (!b) {
      return h('div', { class: 'card' }, h('h1', { id: 'titulo-pagina', tabindex: '-1', class: 'sr-only' }, 'Borrador no encontrado'), App.ui.vacio({
        icono: 'borrador',
        titulo: 'No encontramos el borrador',
        texto: 'Puede que ya lo hayas convertido en ticket o descartado. Los borradores sólo los ve quien los creó.',
        accion: h('a', { class: 'btn btn-primario', href: '#/borradores' }, 'Ver mis borradores'),
      }));
    }
    return formularioTicket(ctx, { borrador: b });
  };
})(window.App = window.App || {});
