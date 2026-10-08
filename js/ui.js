/* ==========================================================================
   Componentes de interfaz reutilizables: iconos, avisos, ventanas,
   insignias, campos de formulario, imágenes y tarjetas de sugerencia.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  // ------------------------------------------------------------- Iconos ---
  // Trazos simples de 24x24 dibujados para la demo.

  const ICONOS = {
    inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>',
    ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v2M14 11v2M14 16v2"/>',
    lista: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    borrador: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    editar: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>',
    circulo: '<circle cx="12" cy="12" r="7.5"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pausa: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    recorrido: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="18" r="2"/><path d="M7 6h5a5 5 0 0 1 5 5M17 13a5 5 0 0 1-5 5H7"/>',
    elevar: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    xCirculo: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    usuarioMas: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 14-5.3"/><path d="M19 15v6M16 18h6"/>',
    asignar: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 13.5-5.8"/><path d="m15.5 18.5 2 2 4-4"/>',
    salir: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    imagen: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    libro: '<path d="M4 19V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/><path d="M8 7h7"/>',
    grafico: '<path d="M3 20h18"/><path d="M6 16v-5M11 16V6M16 16v-8"/>',
    ajustes: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    escudo: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.9 7.5 9 4.3-1.1 7.5-4.4 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    flechaDer: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    flechaIzq: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    derecha: '<path d="m9 6 6 6-6 6"/>',
    basura: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
    reabrir: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
    telefono: '<path d="M5 4h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 6 6l1.4-2.3L20 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    capas: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    etiqueta: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    filtro: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    bombilla: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    comentario: '<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clip: '<path d="m20.5 11.5-8.4 8.4a5 5 0 0 1-7.1-7.1l8.4-8.4a3.3 3.3 0 0 1 4.7 4.7L9.8 17.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/>',
    documento: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    tabla: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 10v10"/>',
    refrescar: '<path d="M20 11a8 8 0 0 0-14.8-4M4 13a8 8 0 0 0 14.8 4"/><path d="M4 4v4h4M20 20v-4h-4"/>',
    pregunta: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8v.5M12 17h.01"/>',
    enviar: '<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>',
    descargar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    bandeja: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
    historial: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    datos: '<ellipse cx="12" cy="5.5" rx="8" ry="2.5"/><path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13"/><path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>',
  };

  function icono(nombre, clase) {
    const trazo = ICONOS[nombre] || ICONOS.circulo;
    return h('span', { class: ['icono', clase], 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" focusable="false">' + trazo + '</svg>' });
  }

  // ------------------------------------------------------------- Avisos ---

  function toast(mensaje, opciones) {
    const op = opciones || {};
    const cont = document.getElementById('toasts');
    if (!cont) return () => {};
    const tipo = op.tipo || 'exito';
    const ic = { exito: 'checkCirculo', error: 'alerta', aviso: 'info' }[tipo] || 'info';
    const el = h('div', { class: ['toast', tipo === 'aviso' ? 'aviso-t' : tipo], role: tipo === 'error' ? 'alert' : null },
      icono(ic), h('div', { class: 'crecer' }, mensaje));
    let timer = null;
    const quitar = () => { clearTimeout(timer); el.remove(); };
    if (op.accion) el.append(h('button', { type: 'button', onClick: () => { quitar(); op.accion.fn(); } }, op.accion.texto));
    el.append(h('button', { type: 'button', class: 'cerrar-toast', 'aria-label': 'Cerrar aviso', onClick: quitar }, icono('x', 'i-sm')));
    cont.append(el);
    const duracion = op.duracion || (op.accion ? 9000 : tipo === 'error' ? 7000 : 4500);
    timer = setTimeout(quitar, duracion);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => { timer = setTimeout(quitar, 2500); });
    return quitar;
  }

  function mostrarError(e) {
    if (e && e.name === 'ErrorDemo') toast(e.message, { tipo: 'error' });
    else {
      console.error(e);
      toast('Algo salió mal. Probá de nuevo o restablecé los datos de la demo.', { tipo: 'error' });
    }
  }

  // ------------------------------------------------------------ Ventanas ---

  const pila = [];
  const SELECTOR_FOCO = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /**
   * modal({ titulo, antetitulo, cuerpo, acciones: [{ texto, clase, icono, fn }], tamano: 'ancho'|'angosto', clase, alCerrar, enfocar })
   * Una acción sin fn cierra la ventana. Si fn devuelve false, queda abierta.
   */
  function modal(op) {
    const anterior = document.activeElement;
    const idTitulo = U.uid('modal-titulo');
    let cerrado = false;
    const api = {};

    const cuerpo = h('div', { class: 'modal-cuerpo' }, op.cuerpo);
    const botones = (op.acciones || []).map((acc) => {
      const b = h('button', { type: 'button', class: ['btn', acc.clase || 'btn-neutro'] }, acc.icono && icono(acc.icono, 'i-sm'), acc.texto);
      b.addEventListener('click', async () => {
        if (!acc.fn) return cerrar();
        b.disabled = true;
        try {
          const r = await acc.fn(api);
          if (r !== false) cerrar(r);
        } catch (e) {
          mostrarError(e);
        } finally {
          if (!cerrado) b.disabled = false;
        }
      });
      return b;
    });
    const caja = h('div', { class: ['modal', op.tamano], role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo },
      h('div', { class: 'modal-cabecera' },
        h('div', { class: 'pila-sm' }, op.antetitulo && h('span', { class: 'antetitulo' }, op.antetitulo), h('h2', { id: idTitulo }, op.titulo)),
        h('button', { type: 'button', class: 'btn btn-fantasma btn-icono btn-sm', 'aria-label': 'Cerrar', onClick: () => cerrar() }, icono('x'))),
      cuerpo,
      botones.length ? h('div', { class: 'modal-pie' }, botones) : null);
    const fondo = h('div', { class: ['modal-fondo', op.clase] }, caja);

    let presionadoEnFondo = false;
    fondo.addEventListener('mousedown', (e) => { presionadoEnFondo = e.target === fondo; });
    fondo.addEventListener('click', (e) => { if (e.target === fondo && presionadoEnFondo) cerrar(); });
    fondo.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar(); return; }
      if (e.key !== 'Tab') return;
      const focos = U.$$(SELECTOR_FOCO, caja).filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!focos.length) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    });

    function cerrar(resultado) {
      if (cerrado) return;
      cerrado = true;
      fondo.remove();
      const i = pila.indexOf(api);
      if (i >= 0) pila.splice(i, 1);
      if (!pila.length) document.body.classList.remove('con-modal');
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) anterior.focus();
      if (op.alCerrar) op.alCerrar(resultado);
    }

    Object.assign(api, { el: caja, cuerpo, botones, cerrar });
    pila.push(api);
    document.body.append(fondo);
    document.body.classList.add('con-modal');
    const destino = (op.enfocar && U.$(op.enfocar, caja)) ||
      U.$('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not(.sr-only), textarea, select', cuerpo) ||
      botones[botones.length - 1] || U.$('button', caja);
    if (destino) setTimeout(() => destino.focus(), 0);
    return api;
  }

  function cerrarModales() {
    while (pila.length) pila[pila.length - 1].cerrar();
  }

  /** Confirmación simple. Devuelve una promesa con true o false. */
  function confirmar(op) {
    return new Promise((resolve) => {
      let ok = false;
      const m = modal({
        titulo: op.titulo,
        tamano: 'angosto',
        cuerpo: typeof op.mensaje === 'string' ? h('p', null, op.mensaje) : op.mensaje,
        acciones: [
          { texto: op.textoCancelar || 'Cancelar', clase: 'btn-neutro' },
          { texto: op.textoConfirmar || 'Confirmar', clase: op.peligro ? 'btn-peligro' : 'btn-primario', fn: () => { ok = true; } },
        ],
        alCerrar: () => resolve(ok),
      });
      if (op.peligro) setTimeout(() => m.botones[0].focus(), 0);
    });
  }

  // ---------------------------------------------------------- Insignias ---

  function badgeEstado(estado, grande) {
    const e = App.dominio.ESTADOS[estado];
    return h('span', { class: ['badge', 'estado-' + estado, grande && 'grande'], title: e ? e.descripcion : null },
      icono(e ? e.icono : 'circulo', 'i-sm'), e ? e.nombre : estado);
  }

  function badgeCriticidad(id, conPrefijo) {
    const c = App.store.criticidad(id);
    if (!c) return h('span', { class: 'badge contorno' }, 'Sin criticidad');
    return h('span', { class: ['badge', c.clase || 'contorno'], title: 'Criticidad ' + c.nombre.toLowerCase() },
      h('span', { class: 'punto' }), conPrefijo ? 'Criticidad ' + c.nombre.toLowerCase() : c.nombre);
  }

  function badgeVisibilidad(v) {
    return v === 'PRIVADO'
      ? h('span', { class: 'badge privado', title: 'Sólo lo ve ORMEN' }, icono('candado', 'i-sm'), 'Privado')
      : h('span', { class: 'badge publico', title: 'Lo ve la localidad' }, icono('ojo', 'i-sm'), 'Público');
  }

  function badgeSolucion(estado) {
    if (estado === 'APROBADA') return h('span', { class: 'badge aprobada' }, icono('checkCirculo', 'i-sm'), 'Aprobada');
    if (estado === 'PENDIENTE') return h('span', { class: 'badge pendiente-aprob', title: 'Espera que un administrador la apruebe.' }, icono('borrador', 'i-sm'), 'Por aprobar');
    return h('span', { class: 'badge rechazada' }, icono('xCirculo', 'i-sm'), 'Rechazada');
  }

  /**
   * Atributo "Elevado a …" de un ticket. Con `alClic` es un botón (abre el
   * recorrido del ticket).
   */
  function badgeElevado(t, alClic) {
    if (!t.elevadoA) return null;
    const contenido = [icono('elevar', 'i-sm'), 'Elevado a ' + App.store.nombreDestino(t.elevadoA)];
    return alClic
      ? h('button', { type: 'button', class: 'badge elevado', title: 'Ver el recorrido del ticket', onClick: alClic }, contenido)
      : h('span', { class: 'badge elevado' }, contenido);
  }

  /** Destacado de un ticket del que surgió una solución aprobada. */
  function badgeOrigenSolucion(sol, enlace) {
    if (!sol) return null;
    const contenido = [icono('libro', 'i-sm'), 'Originó una solución reutilizable'];
    return enlace
      ? h('a', { class: 'badge origen-solucion', href: '#/soluciones/' + sol.id, title: '«' + sol.titulo + '»' }, contenido)
      : h('span', { class: 'badge origen-solucion', title: '«' + sol.titulo + '»' }, contenido);
  }

  function badgeTipoSolicitud(id) {
    if (id !== 'ts-sugerencia') return null;
    return h('span', { class: 'badge sugerencia' }, icono('bombilla', 'i-sm'), 'Sugerencia de funcionalidad');
  }

  // Las marcas de pendientes con ORMEN no se muestran en la interfaz.
  function pendiente() { return null; }
  function avisoPendiente() { return null; }

  function aviso(texto, tipo, ic) {
    return h('div', { class: ['aviso', tipo] }, icono(ic || (tipo === 'rojo' ? 'alerta' : tipo === 'verde' ? 'checkCirculo' : 'info')), h('div', { class: 'crecer' }, texto));
  }

  function nombreRol(u) {
    return u && App.dominio.ROLES[u.rol] ? App.dominio.ROLES[u.rol].nombre : '';
  }

  function avatar(u, tam) {
    const clase = !u ? '' : u.rol === 'CLIENTE' ? 'cliente' : u.rol === 'ADMINISTRADOR' ? 'admin' : '';
    return h('span', { class: ['avatar', clase, tam], 'aria-hidden': 'true' }, U.iniciales(u ? u.nombre : '?'));
  }

  function vacio(op) {
    return h('div', { class: 'vacio' },
      h('div', { class: 'circulo' }, icono(op.icono || 'bandeja', 'i-lg')),
      h('h3', null, op.titulo),
      op.accion);
  }

  function tiempo(fecha, completo) {
    if (!fecha) return '—';
    return h('time', { datetime: fecha, title: U.fechaHora(fecha) }, completo ? U.fechaHora(fecha) : U.relativo(fecha));
  }

  /** Cabecera de página. El h1 recibe el foco al navegar. */
  function cabecera(op) {
    return h('div', { class: 'cabecera' },
      h('div', { class: 'titulos' },
        op.migas && h('nav', { class: 'migas', 'aria-label': 'Ubicación' }, op.migas.map((m, i) => [
          i > 0 && icono('derecha', 'i-sm'),
          m.href ? h('a', { href: m.href }, m.texto) : h('span', { 'aria-current': 'page' }, m.texto),
        ])),
        h('h1', { id: 'titulo-pagina', tabindex: '-1' }, op.titulo)),
      op.acciones && h('div', { class: 'acciones' }, op.acciones));
  }

  // -------------------------------------------------------- Formularios ---

  function etiqueta(texto, requerido, opcional) {
    return [texto, requerido && h('span', { class: 'requerido', 'aria-hidden': 'true' }, '*'), opcional && h('span', { class: 'opcional' }, '(opcional)')];
  }

  /** campo({ nombre, id, etiqueta, requerido, opcional, control, extraEtiqueta, clase }) */
  function campo(op) {
    const id = op.id || op.nombre;
    const idError = id + '-error';
    if (op.control && op.control.setAttribute) {
      op.control.setAttribute('aria-describedby', idError);
      if (op.requerido) op.control.setAttribute('aria-required', 'true');
    }
    return h('div', { class: ['campo', op.clase], dataset: { campo: op.nombre || id } },
      h('label', { for: id }, etiqueta(op.etiqueta, op.requerido, op.opcional), op.extraEtiqueta),
      op.control,
      h('div', { class: 'error-campo', id: idError, hidden: true }));
  }

  /** Grupo de opciones (radios) con fieldset y legend. */
  function grupo(op) {
    const idError = op.nombre + '-error';
    return h('fieldset', { class: ['campo', op.clase], dataset: { campo: op.nombre }, 'aria-describedby': idError },
      h('legend', null, etiqueta(op.etiqueta, op.requerido, op.opcional), op.extraEtiqueta),
      op.control,
      h('div', { class: 'error-campo', id: idError, hidden: true }));
  }

  function select(op) {
    const el = h('select', { id: op.id, name: op.nombre || op.id, class: 'control', disabled: op.deshabilitado },
      op.vacio !== undefined && h('option', { value: '' }, op.vacio),
      (op.opciones || []).map((o) => (o.grupo
        ? h('optgroup', { label: o.grupo }, o.opciones.map((x) => h('option', { value: x.valor, disabled: x.deshabilitado }, x.texto)))
        : h('option', { value: o.valor, disabled: o.deshabilitado }, o.texto))));
    el.value = op.valor == null ? '' : op.valor;
    if (op.onChange) el.addEventListener('change', () => op.onChange(el.value));
    return el;
  }

  function segmentado(op) {
    return h('div', { class: 'segmentado' },
      op.opciones.map((o) => h('label', null,
        h('input', { type: 'radio', name: op.nombre, value: o.valor, checked: op.valor === o.valor, onChange: () => op.onChange && op.onChange(o.valor) }),
        h('span', null, o.punto && h('i', { class: ['cri-dot', o.punto], 'aria-hidden': 'true' }), o.icono && icono(o.icono, 'i-sm'),
          o.detalle ? h('span', { class: 'seg-textos' }, h('strong', null, o.texto), h('small', null, o.detalle)) : o.texto))));
  }

  function valorRadio(raiz, nombre) {
    const el = raiz.querySelector('input[name="' + nombre + '"]:checked');
    return el ? el.value : '';
  }

  function textoEtiqueta(contenedor) {
    const l = contenedor.querySelector(':scope > label, :scope > legend');
    if (!l) return '';
    const copia = l.cloneNode(true);
    copia.querySelectorAll('.requerido, .opcional, .pendiente-def, .badge').forEach((x) => x.remove());
    return copia.textContent.trim();
  }

  function limpiarErrores(raiz) {
    U.$$('.campo', raiz).forEach((c) => {
      const e = c.querySelector(':scope > .error-campo');
      if (e) { e.hidden = true; U.vaciar(e); }
    });
    U.$$('.invalido', raiz).forEach((x) => x.classList.remove('invalido'));
    U.$$('[aria-invalid="true"]', raiz).forEach((x) => x.removeAttribute('aria-invalid'));
    U.$$('.errores-resumen', raiz).forEach((x) => x.remove());
  }

  /**
   * Marca los campos con error y, si hay más de uno, muestra un resumen al
   * principio de `resumenEn` con enlaces a cada campo.
   */
  function mostrarErrores(raiz, campos, resumenEn) {
    limpiarErrores(raiz);
    const claves = Object.keys(campos || {});
    if (!claves.length) return;
    const items = [];
    let primero = null;
    for (const k of claves) {
      const c = raiz.querySelector('[data-campo="' + k + '"]');
      if (!c) { items.push({ texto: campos[k] }); continue; }
      const e = c.querySelector(':scope > .error-campo');
      if (e) { U.vaciar(e).append(icono('alerta', 'i-sm'), campos[k]); e.hidden = false; }
      const controles = U.$$('.control, input, select, textarea', c).filter((x) => x.type !== 'file');
      controles.forEach((x) => { x.setAttribute('aria-invalid', 'true'); if (x.classList.contains('control')) x.classList.add('invalido'); });
      U.$$('.segmentado, .visibilidad-opciones', c).forEach((x) => x.classList.add('invalido'));
      const foco = controles.find((x) => x.offsetParent !== null) || controles[0];
      if (!primero) primero = foco;
      items.push({ texto: campos[k], etiqueta: textoEtiqueta(c), foco });
    }
    if (resumenEn && claves.length > 1) {
      const resumen = h('div', { class: 'errores-resumen', tabindex: '-1', role: 'alert' },
        h('strong', null, 'Faltan datos para continuar:'),
        h('ul', null, items.map((it) => h('li', null,
          it.foco ? h('button', { type: 'button', class: 'enlace-boton', style: 'color: inherit; text-decoration: underline;', onClick: () => it.foco.focus() }, it.etiqueta ? it.etiqueta + ': ' + it.texto : it.texto) : it.texto))));
      resumenEn.prepend(resumen);
      resumen.focus();
    } else if (primero) {
      primero.focus();
    }
  }

  /** Entrada de palabras clave como etiquetas. */
  function entradaPalabras(op) {
    let palabras = (op.valor || []).slice();
    const lista = h('div', { class: 'chips', 'aria-live': 'polite' });
    const input = h('input', { id: op.id, class: 'control', type: 'text', autocomplete: 'off', placeholder: op.placeholder || 'Escribí una palabra o frase y apretá Enter' });
    function cambio() { if (op.alCambiar) op.alCambiar(palabras.slice()); }
    function agregar() {
      const partes = input.value.split(',').map((x) => x.trim()).filter(Boolean);
      if (!partes.length) return;
      for (const t of partes) {
        if (!palabras.some((p) => U.normalizar(p) === U.normalizar(t))) palabras.push(t.toLowerCase());
      }
      input.value = '';
      pintar();
      cambio();
    }
    function quitar(i) { palabras.splice(i, 1); pintar(); cambio(); input.focus(); }
    function pintar() {
      U.vaciar(lista);
      palabras.forEach((p, i) => lista.append(h('span', { class: 'palabra-clave' }, p,
        h('button', { type: 'button', 'aria-label': 'Quitar «' + p + '»', onClick: () => quitar(i) }, icono('x', 'i-sm')))));
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); agregar(); }
      else if (e.key === 'Backspace' && !input.value && palabras.length) quitar(palabras.length - 1);
    });
    input.addEventListener('blur', agregar);
    pintar();
    return {
      el: h('div', { class: 'pila-sm' }, input, lista),
      input,
      valor() { agregar(); return palabras.slice(); },
      establecer(nuevas) { palabras = (nuevas || []).slice(); pintar(); },
    };
  }

  // ----------------------------------------------------------- Imágenes ---

  const MAX_LADO = 1400;
  const MAX_BYTES = 10 * 1024 * 1024;

  function leerComoDataUrl(archivo) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(archivo);
    });
  }

  function cargarImagen(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('lectura'));
      img.src = src;
    });
  }

  /** Achica las imágenes grandes para que entren en el almacenamiento del navegador. */
  async function procesarImagen(archivo) {
    if (archivo.size > MAX_BYTES) throw new Error('grande');
    const original = await leerComoDataUrl(archivo);
    if (archivo.type === 'image/svg+xml' || archivo.type === 'image/gif') {
      if (archivo.size > 400 * 1024) throw new Error('grande');
      return original;
    }
    const img = await cargarImagen(original);
    const lado = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    const escala = Math.min(1, MAX_LADO / lado);
    if (escala === 1 && archivo.size <= 300 * 1024) return original;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.84);
  }

  function nombreArchivo(f) {
    if (f.name && !/^image\.(png|jpe?g|gif|webp)$/i.test(f.name)) return f.name;
    const d = new Date();
    return 'imagen-pegada-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '.' + ((f.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg'));
  }

  /**
   * Zona para adjuntar imágenes: botón, arrastrar y soltar, o pegar con
   * Ctrl+V (en la zona o en los campos de texto indicados en `pegarEn`).
   */
  function selectorImagenes(op) {
    const opciones = op || {};
    const max = opciones.max || 6;
    let lista = (opciones.inicial || []).map((a) => Object.assign({}, a));
    const input = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' });
    const miniaturas = h('div', { class: 'miniaturas' });
    const zona = h('div', { class: 'zona-imagenes', tabindex: '0', role: 'group', 'aria-label': (opciones.etiqueta || 'Imágenes') + '. Podés pegar una imagen con Control más V.' },
      icono('imagen'),
      h('span', { class: 'crecer' }, opciones.texto || 'Arrastrá o pegá imágenes'),
      h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => input.click() }, icono('clip', 'i-sm'), 'Adjuntar imagen'),
      input,
      miniaturas);

    function cambio() { if (opciones.alCambiar) opciones.alCambiar(lista.slice()); }

    async function agregarArchivos(archivos) {
      const arr = Array.from(archivos || []);
      if (!arr.length) return;
      const libres = max - lista.length;
      if (libres <= 0) { toast('Podés adjuntar hasta ' + max + ' imágenes.', { tipo: 'aviso' }); return; }
      if (arr.length > libres) toast('Se agregan sólo ' + U.plural(libres, 'imagen', 'imágenes') + ' (máximo ' + max + ').', { tipo: 'aviso' });
      for (const f of arr.slice(0, libres)) {
        if (!/^image\//.test(f.type)) { toast('«' + f.name + '» no es una imagen.', { tipo: 'error' }); continue; }
        try {
          const dataUrl = await procesarImagen(f);
          lista.push({ nombre: nombreArchivo(f), dataUrl });
        } catch (e) {
          toast(e.message === 'grande' ? '«' + f.name + '» es demasiado grande.' : 'No se pudo leer «' + f.name + '».', { tipo: 'error' });
        }
      }
      pintar();
      cambio();
    }

    function pintar() {
      U.vaciar(miniaturas);
      lista.forEach((a, i) => miniaturas.append(h('div', { class: 'miniatura' },
        h('button', { type: 'button', class: 'ver', 'aria-label': 'Ver ' + a.nombre, onClick: () => lightbox(lista, i) }, h('img', { src: a.dataUrl, alt: '' })),
        h('button', { type: 'button', class: 'quitar', 'aria-label': 'Quitar ' + a.nombre, onClick: () => { lista.splice(i, 1); pintar(); cambio(); zona.focus(); } }, icono('x', 'i-sm')))));
    }

    const tieneArchivos = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    zona.addEventListener('dragover', (e) => { if (tieneArchivos(e)) { e.preventDefault(); zona.classList.add('arrastrando'); } });
    zona.addEventListener('dragleave', (e) => { if (!zona.contains(e.relatedTarget)) zona.classList.remove('arrastrando'); });
    zona.addEventListener('drop', (e) => {
      if (!tieneArchivos(e)) return;
      e.preventDefault();
      zona.classList.remove('arrastrando');
      agregarArchivos(e.dataTransfer.files);
    });
    const alPegar = (e) => {
      const archivos = Array.from((e.clipboardData && e.clipboardData.files) || []).filter((f) => /^image\//.test(f.type));
      if (!archivos.length) return;
      const hayTexto = e.clipboardData.types && Array.from(e.clipboardData.types).includes('text/plain');
      if (!hayTexto) e.preventDefault();
      agregarArchivos(archivos);
      toast('Imagen pegada como adjunto.', { tipo: 'aviso', duracion: 2500 });
    };
    zona.addEventListener('paste', alPegar);
    (opciones.pegarEn || []).forEach((el) => el.addEventListener('paste', alPegar));
    input.addEventListener('change', () => { agregarArchivos(input.files); input.value = ''; });
    pintar();

    return {
      el: zona,
      valor: () => lista.map((a) => Object.assign({}, a)),
      limpiar() { lista = []; pintar(); },
      agregarArchivos,
      get cantidad() { return lista.length; },
    };
  }

  /** Miniaturas que abren la imagen en grande. */
  function galeria(adjuntos, op) {
    const lista = adjuntos || [];
    if (!lista.length) return null;
    return h('div', { class: 'miniaturas' }, lista.map((a, i) => h('div', { class: ['miniatura', op && op.grande && 'grande'] },
      h('button', { type: 'button', class: 'ver', 'aria-label': 'Ver imagen ' + (a.nombre || i + 1), onClick: () => lightbox(lista, i) },
        h('img', { src: a.dataUrl, alt: '', loading: 'lazy' })))));
  }

  function lightbox(lista, indice) {
    let i = indice || 0;
    const img = h('img', { alt: '' });
    const pie = h('p', { class: 'chico suave centrado' });
    const descargar = h('a', { class: 'btn btn-neutro btn-sm', download: 'imagen' }, icono('descargar', 'i-sm'), 'Descargar');
    const anterior = h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => mover(-1) }, icono('flechaIzq', 'i-sm'), 'Anterior');
    const siguiente = h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => mover(1) }, 'Siguiente', icono('flechaDer', 'i-sm'));
    function mostrar() {
      const a = lista[i];
      img.src = a.dataUrl;
      img.alt = a.nombre || 'Imagen adjunta';
      pie.textContent = [a.nombre, a.origen, lista.length > 1 ? (i + 1) + ' de ' + lista.length : null].filter(Boolean).join(' · ');
      descargar.href = a.dataUrl;
      descargar.setAttribute('download', a.nombre || 'imagen');
      anterior.hidden = siguiente.hidden = lista.length < 2;
    }
    function mover(d) { i = (i + d + lista.length) % lista.length; mostrar(); }
    const m = modal({
      titulo: 'Imagen adjunta', tamano: 'ancho', clase: 'lightbox',
      cuerpo: [img, pie, h('div', { class: 'fila', style: 'justify-content: center' }, anterior, descargar, siguiente)],
      enfocar: '.modal-cabecera button',
    });
    m.el.addEventListener('keydown', (e) => {
      if (lista.length < 2) return;
      if (e.key === 'ArrowLeft') mover(-1);
      if (e.key === 'ArrowRight') mover(1);
    });
    mostrar();
  }

  // -------------------------------------------------------- Sugerencias ---

  function clasificacion(sistemaId, subsistemaId) {
    const S = App.store;
    if (!sistemaId) return 'General (sirve para cualquier sistema)';
    return S.nombre('sistemas', sistemaId) + (subsistemaId ? ' › ' + S.nombre('subsistemas', subsistemaId) : '');
  }

  function fuenteSugerencia(r) {
    const S = App.store;
    if (r.tipo === 'catalogo') {
      return [icono('libro', 'i-sm'), h('span', { class: 'origen' }, 'Solución reutilizable · ' + (r.usos ? 'usada ' + U.plural(r.usos, 'vez', 'veces') : 'sin usos'))];
    }
    const t = r.ticket;
    return [icono('ticket', 'i-sm'), h('span', { class: 'origen' }, 'Resolución del ticket #' + t.numero + ' · ' + S.nombre('localidades', t.localidadId) + ' · ' + U.fecha(t.cerradoEn))];
  }

  function motivos(r) {
    return h('div', { class: 'motivos' }, r.motivos.map((m) => h('span', { class: 'motivo' }, h('b', null, '+' + m.puntos), ' ', m.texto)));
  }

  /** Tarjeta de una sugerencia de solución. */
  function tarjetaSugerencia(r, op) {
    const o = op || {};
    return h('article', { class: ['sugerencia', o.mejor && 'mejor'] },
      h('div', { class: 'fuente' }, h('span', { class: 'puntaje', title: 'Puntaje' }, r.puntaje + ' pts'), fuenteSugerencia(r)),
      r.parecidos ? h('p', { class: 'parecidos' }, 'También se resolvió así en ' + U.plural(r.parecidos, 'caso más', 'casos más') + '.') : null,
      h('h4', null, r.titulo),
      h('p', { class: 'resumen' }, r.texto),
      motivos(r),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => modalSugerencia(r, o) }, 'Ver detalle'),
        o.alUsar && h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => o.alUsar(r) }, icono('check', 'i-sm'), o.textoUsar || 'Usar en la resolución')));
  }

  function modalSugerencia(r, op) {
    const S = App.store;
    const o = op || {};
    const partes = [];
    if (r.tipo === 'catalogo') {
      const s = r.solucion;
      partes.push(h('div', { class: 'fila-sm' }, badgeSolucion(s.estado), h('span', { class: 'chico suave' }, clasificacion(s.sistemaId, s.subsistemaId))));
      partes.push(h('div', { class: 'pasos' }, s.descripcion));
      if (s.adjuntos.length) partes.push(galeria(s.adjuntos, { grande: true }));
      partes.push(h('div', { class: 'pila-sm' }, h('span', { class: 'chico fuerte' }, 'Palabras clave'),
        h('div', { class: 'chips' }, s.palabrasClave.map((p) => h('span', { class: ['palabra-clave', r.palabras.includes(p) && 'coincide'] }, p)))));
    } else {
      const t = r.ticket;
      partes.push(h('div', { class: 'meta' },
        h('span', null, 'Localidad: ', h('strong', null, S.nombre('localidades', t.localidadId))),
        h('span', null, 'Sistema: ', h('strong', null, clasificacion(t.sistemaId, t.subsistemaId))),
        h('span', null, 'Cerrado: ', h('strong', null, U.fechaHora(t.cerradoEn))),
        h('span', null, 'Por: ', h('strong', null, (S.usuario(t.solucion.autorId) || {}).nombre || '—'))));
      partes.push(h('div', { class: 'pila-sm' }, h('span', { class: 'chico fuerte' }, 'Problema'), h('div', { class: 'bloque-texto' }, t.descripcion)));
      partes.push(h('div', { class: 'solucion-ticket' }, h('h3', null, icono('checkCirculo'), 'Resolución'), h('div', { class: 'bloque-texto' }, t.solucion.texto),
        galeria(t.solucion.adjuntos),
        t.solucion.solucionCatalogoId && h('p', { class: 'chico' }, 'Basada en la solución reutilizable «', S.nombre('soluciones', t.solucion.solucionCatalogoId, ''), '».')));
      if (r.palabras.length) partes.push(h('p', { class: 'chico suave' }, 'Palabras en común: ', r.palabras.join(', ')));
    }
    partes.push(h('div', { class: 'pila-sm' }, h('span', { class: 'chico fuerte' }, 'Por qué aparece (' + r.puntaje + ' pts)'), motivos(r)));
    const enlace = r.tipo === 'catalogo' ? '#/soluciones/' + r.id : '#/tickets/' + r.ticket.numero;
    const m = modal({
      antetitulo: r.tipo === 'catalogo' ? 'Solución reutilizable' : 'Resolución del ticket #' + r.ticket.numero,
      titulo: r.titulo,
      tamano: 'ancho',
      cuerpo: partes,
      acciones: [
        { texto: 'Cerrar', clase: 'btn-neutro' },
        { texto: r.tipo === 'catalogo' ? 'Abrir la solución' : 'Abrir el ticket', clase: 'btn-secundario', fn: () => { location.hash = enlace; } },
        o.alUsar && { texto: o.textoUsar || 'Usar en la resolución', clase: 'btn-primario', icono: 'check', fn: () => { o.alUsar(r); } },
      ].filter(Boolean),
    });
    return m;
  }

  // ------------------------------------------------------------ Paginador ---

  function paginador(op) {
    const paginas = Math.max(1, Math.ceil(op.total / op.porPagina));
    const pagina = Math.min(Math.max(1, op.pagina), paginas);
    const desde = op.total ? (pagina - 1) * op.porPagina + 1 : 0;
    const hasta = Math.min(op.total, pagina * op.porPagina);
    return h('div', { class: 'paginador' },
      h('span', null, op.total ? 'Mostrando ' + desde + '–' + hasta + ' de ' + U.formatoNumero(op.total) : 'Sin resultados'),
      paginas > 1 && h('div', { class: 'fila-sm' },
        h('button', { type: 'button', class: 'btn btn-neutro btn-sm', disabled: pagina <= 1, onClick: () => op.alCambiar(pagina - 1) }, icono('flechaIzq', 'i-sm'), 'Anterior'),
        h('span', { class: 'chico' }, 'Página ' + pagina + ' de ' + paginas),
        h('button', { type: 'button', class: 'btn btn-neutro btn-sm', disabled: pagina >= paginas, onClick: () => op.alCambiar(pagina + 1) }, 'Siguiente', icono('flechaDer', 'i-sm'))));
  }

  /** Celda de tabla que en celulares muestra su etiqueta. */
  function celda(etiquetaTxt, contenido, clase) {
    return h('td', { 'data-label': etiquetaTxt, class: clase }, contenido);
  }

  App.ui = {
    ICONOS, icono, toast, mostrarError, modal, cerrarModales, confirmar,
    badgeEstado, badgeCriticidad, badgeVisibilidad, badgeSolucion, badgeTipoSolicitud, badgeElevado, badgeOrigenSolucion,
    pendiente, avisoPendiente, aviso, nombreRol, avatar, vacio, tiempo, cabecera,
    campo, grupo, select, segmentado, valorRadio, limpiarErrores, mostrarErrores, entradaPalabras,
    selectorImagenes, galeria, lightbox,
    clasificacion, tarjetaSugerencia, modalSugerencia,
    paginador, celda,
  };
})(window.App = window.App || {});
