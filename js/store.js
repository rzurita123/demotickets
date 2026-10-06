/* ==========================================================================
   Almacén de la demo.

   Guarda la base en localStorage y aplica las reglas de negocio: visibilidad
   por localidad, estados del ticket, comentarios públicos y privados, cierre
   con solución, aprobación de soluciones, auditoría y correos simulados.

   En el sistema real esto lo resuelve el backend (.NET + SQL Server); acá
   vive en el navegador para que la demo funcione sin servidor. Cada pestaña
   tiene su propia sesión, pero todas comparten los mismos datos.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const D = App.dominio;

  const CLAVE = 'ormen-tickets-demo:db';
  const MAX_AUDITORIA = 4000;
  const MAX_CORREOS = 1500;

  let db = null;
  let disponible = true; // localStorage utilizable
  const oyentes = new Set();

  class ErrorDemo extends Error {
    constructor(mensaje, campos) {
      super(mensaje);
      this.name = 'ErrorDemo';
      this.campos = campos || null;
    }
  }

  function exigir(condicion, mensaje) {
    if (!condicion) throw new ErrorDemo(mensaje);
  }

  function errorDeCampos(campos) {
    const n = Object.keys(campos).length;
    return new ErrorDemo(n === 1 ? 'Revisá el campo marcado.' : 'Revisá los ' + n + ' campos marcados.', campos);
  }

  // ------------------------------------------------------- Persistencia ---

  function probarAlmacenamiento() {
    try {
      const k = CLAVE + ':prueba';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  function leerGuardado() {
    if (!disponible) return null;
    try {
      const txt = localStorage.getItem(CLAVE);
      if (!txt) return null;
      const d = JSON.parse(txt);
      if (!d || d.version !== App.semilla.VERSION || !Array.isArray(d.tickets)) return null;
      return d;
    } catch {
      return null;
    }
  }

  function escribir() {
    if (!disponible) return true;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(db));
      return true;
    } catch {
      return false;
    }
  }

  function emitir(info) {
    for (const fn of oyentes) {
      try { fn(info); } catch (e) { console.error(e); }
    }
  }

  // ---------------------------------------------------- Base compartida ---

  /**
   * En la demo publicada en Vercel la base se comparte entre todas las
   * personas por medio de api/db (un JSON en Vercel Blob). localStorage
   * sigue siendo la copia local: con ella arranca la pantalla y es la única
   * base cuando la demo se abre con doble clic o con un servidor sin api/.
   *
   * Para no gastar las operaciones del plan gratuito de Vercel Blob, los
   * cambios se suben agrupados y la base se vuelve a leer al abrir la demo y
   * al volver a la pestaña (no hay consultas periódicas).
   */
  const API = 'api/db';
  const ESPERA_SUBIDA = 1200;
  const ESPERA_LECTURA = 15000;
  const CLAVE_ETAG = CLAVE + ':etag';
  const remoto = { modo: 'local', etag: null, pendiente: false, subiendo: false, temporizador: null, ultimaLectura: 0 };
  const oyentesRemoto = new Set();

  function cambiarModo(modo) {
    if (remoto.modo === modo) return;
    remoto.modo = modo;
    for (const fn of oyentesRemoto) {
      try { fn(modo); } catch (e) { console.error(e); }
    }
  }

  /** 'local', 'conectando', 'compartida', 'guardando' o 'sin-conexion'. */
  function estadoRemoto() {
    return remoto.modo;
  }

  function alCambiarRemoto(fn) {
    oyentesRemoto.add(fn);
    return () => oyentesRemoto.delete(fn);
  }

  const usaRemoto = () => remoto.modo !== 'local';

  /** El etag se comparte con las otras pestañas de este navegador (cambian la misma base). */
  function guardarEtag(etag) {
    remoto.etag = etag || null;
    try {
      if (etag) localStorage.setItem(CLAVE_ETAG, etag);
      else localStorage.removeItem(CLAVE_ETAG);
    } catch { /* queda en memoria */ }
  }

  async function leerRemoto(forzar) {
    if (!usaRemoto()) return;
    if (!forzar && (remoto.pendiente || remoto.subiendo || Date.now() - remoto.ultimaLectura < ESPERA_LECTURA)) return;
    remoto.ultimaLectura = Date.now();
    let res;
    try {
      res = await fetch(API, { cache: 'no-store', headers: remoto.etag && !forzar ? { 'If-None-Match': remoto.etag } : {} });
    } catch {
      cambiarModo('sin-conexion');
      return;
    }
    if (!res.headers.get('X-Demo-Db') || res.status === 501) {
      // No hay api/ (doble clic o servidor estático) o no tiene Vercel Blob conectado: todo queda en el navegador.
      cambiarModo('local');
      return;
    }
    if (res.status === 304) { cambiarModo('compartida'); return; }
    if (!res.ok) { cambiarModo('sin-conexion'); return; }
    const { etag, db: base } = await res.json();
    if (!base || base.version < App.semilla.VERSION || !Array.isArray(base.tickets)) {
      // Vacía o de una versión anterior de la demo: se reemplaza por la de este navegador.
      guardarEtag(etag);
      cambiarModo('compartida');
      programarSubida(0);
      return;
    }
    if (base.version > App.semilla.VERSION) {
      cambiarModo('local');
      emitir({ externo: false, aviso: 'Hay una versión más nueva de la demo. Recargá la página para ver los datos compartidos.' });
      return;
    }
    guardarEtag(etag);
    cambiarModo('compartida');
    if (JSON.stringify(base) !== JSON.stringify(db)) {
      if (forzar) remoto.pendiente = false; // gana la base compartida
      db = base;
      escribir();
      emitir({ externo: true });
    }
  }

  function programarSubida(espera) {
    if (!usaRemoto()) return;
    remoto.pendiente = true;
    if (remoto.modo === 'conectando') return; // se sube cuando termina la primera lectura
    clearTimeout(remoto.temporizador);
    remoto.temporizador = setTimeout(subir, espera == null ? ESPERA_SUBIDA : espera);
  }

  async function subir() {
    if (!usaRemoto() || remoto.modo === 'conectando') return;
    if (remoto.subiendo) { programarSubida(); return; }
    remoto.subiendo = true;
    remoto.pendiente = false;
    cambiarModo('guardando');
    let res = null;
    try {
      res = await fetch(API, {
        method: 'PUT',
        cache: 'no-store',
        headers: Object.assign({ 'Content-Type': 'application/json' }, remoto.etag ? { 'If-Match': remoto.etag } : {}),
        body: JSON.stringify(db),
      });
    } catch { /* sin conexión: se reintenta con el próximo cambio o al volver a la pestaña */ }
    remoto.subiendo = false;
    if (res && res.ok) {
      guardarEtag((await res.json()).etag);
      cambiarModo('compartida');
    } else if (res && res.status === 412) {
      // Otra persona guardó antes: gana su versión.
      remoto.pendiente = false;
      cambiarModo('compartida');
      await leerRemoto(true);
      emitir({ externo: true, aviso: 'Otra persona cambió los datos al mismo tiempo. Se cargó la última versión y tu último cambio no se guardó: repetilo.' });
      return;
    } else if (res && res.status === 413) {
      remoto.pendiente = false;
      cambiarModo('sin-conexion');
      emitir({ externo: false, aviso: 'La base quedó demasiado grande para guardarla en línea (probá con menos imágenes). El cambio quedó sólo en este navegador.' });
      return;
    } else {
      remoto.pendiente = true;
      cambiarModo('sin-conexion');
      return;
    }
    if (remoto.pendiente) programarSubida();
  }

  async function conectarRemoto() {
    if (!/^https?:$/.test(location.protocol)) return;
    cambiarModo('conectando');
    await leerRemoto(true);
    if (remoto.modo !== 'local' && remoto.pendiente) programarSubida(0);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (remoto.pendiente && remoto.modo === 'sin-conexion') programarSubida(0);
      else leerRemoto(false);
    });
    window.addEventListener('online', () => { if (remoto.pendiente) programarSubida(0); });
    window.addEventListener('beforeunload', (e) => {
      if (remoto.pendiente || remoto.subiendo) e.preventDefault();
    });
  }

  /** Vuelve a leer la base compartida ahora (botón "Actualizar"). */
  function sincronizar() {
    if (remoto.pendiente) { programarSubida(0); return Promise.resolve(); }
    return leerRemoto(true);
  }

  /** Aplica un cambio; si no se puede guardar, lo deshace. */
  function mutar(fn) {
    const respaldo = JSON.stringify(db);
    let resultado;
    try {
      resultado = fn();
    } catch (e) {
      db = JSON.parse(respaldo);
      throw e;
    }
    if (!escribir()) {
      db = JSON.parse(respaldo);
      throw new ErrorDemo('El navegador no tiene espacio para guardar este cambio. Probá con menos imágenes o restablecé los datos de la demo.');
    }
    emitir({ externo: false });
    programarSubida();
    return resultado;
  }

  function iniciar() {
    disponible = probarAlmacenamiento();
    db = leerGuardado();
    if (!db) {
      db = App.semilla.generar();
      escribir();
    }
    window.addEventListener('storage', (e) => {
      if (e.key === CLAVE_ETAG) { remoto.etag = e.newValue || null; return; }
      if (e.key !== CLAVE) return;
      const nuevo = leerGuardado();
      if (nuevo) db = nuevo;
      else {
        db = App.semilla.generar();
        escribir();
      }
      emitir({ externo: true });
    });
    conectarRemoto();
    return { almacenamiento: disponible };
  }

  function alCambiar(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }

  function restablecer(usuarioId) {
    db = App.semilla.generar();
    if (usuarioId && usuario(usuarioId)) auditar(usuarioId, 'DATOS_RESTABLECIDOS', null, 'Se volvió a generar la base de ejemplo');
    escribir();
    emitir({ externo: false, restablecido: true });
    programarSubida(0);
  }

  // ---------------------------------------------------------- Consultas ---

  const porId = (lista, id) => (id ? lista.find((x) => x.id === id) || null : null);

  const usuario = (id) => porId(db.usuarios, id);
  const localidad = (id) => porId(db.localidades, id);
  const sistema = (id) => porId(db.sistemas, id);
  const subsistema = (id) => porId(db.subsistemas, id);
  const tipoProblema = (id) => porId(db.tiposProblema, id);
  const criticidad = (id) => porId(db.criticidades, id);
  const tipoSolicitud = (id) => porId(db.tiposSolicitud, id);
  const solucion = (id) => porId(db.soluciones, id);
  const ticket = (id) => porId(db.tickets, id);

  /** Nombre de un elemento de catálogo (o título, para soluciones); `siNo` si no existe. */
  function nombre(coleccion, id, siNo) {
    const x = porId(db[coleccion], id);
    if (x) return x.nombre != null ? x.nombre : x.titulo;
    return siNo === undefined ? '—' : siNo;
  }

  function nombreEstado(e) {
    return D.ESTADOS[e] ? D.ESTADOS[e].nombre : e;
  }

  /** "Marcelo Techera (Pando)" para clientes, "Valeria Pereira (Mesa de ayuda)" para ORMEN. */
  function etiquetaUsuario(u) {
    if (!u) return 'Usuario eliminado';
    if (u.rol === 'CLIENTE') return u.nombre + ' (' + nombre('localidades', u.localidadId, 'sin localidad') + ')';
    return u.nombre + ' (' + (u.rol === 'OPERADOR' ? 'Mesa de ayuda' : 'ORMEN') + ')';
  }

  function activos(lista, campo) {
    return lista.filter((x) => x[campo || 'activo'] !== false);
  }

  const orden = (a, b) => a.nombre.localeCompare(b.nombre, 'es');

  function usuarios(filtro) {
    let l = db.usuarios.slice();
    if (filtro && filtro.rol) l = l.filter((u) => u.rol === filtro.rol);
    if (filtro && filtro.activo) l = l.filter((u) => u.activo !== false);
    return l.sort(orden);
  }
  function operadores(soloActivos) {
    return usuarios({ rol: 'OPERADOR', activo: !!soloActivos });
  }
  function localidades(soloActivas) {
    const l = soloActivas ? activos(db.localidades, 'activa') : db.localidades.slice();
    return l.sort(orden);
  }
  function sistemas(soloActivos) {
    return soloActivos ? activos(db.sistemas) : db.sistemas.slice();
  }
  function subsistemasDe(sistemaId, soloActivos) {
    const l = db.subsistemas.filter((x) => x.sistemaId === sistemaId);
    return soloActivos ? activos(l) : l;
  }
  function catalogo(tipo, soloActivos) {
    const l = db[tipo].slice();
    return soloActivos ? activos(l) : l;
  }

  // ------------------------------------------------------------ Tickets ---

  /**
   * Regla de visibilidad (ORMEN): un cliente ve todos los tickets de SU
   * localidad, sin jerarquías. Los usuarios de ORMEN ven todo (supuesto del
   * equipo). Un borrador sólo lo ve quien lo creó.
   */
  function puedeVerTicket(t, u) {
    if (!t || !u) return false;
    if (t.estado === 'BORRADOR') return t.creadoPorId === u.id;
    if (u.rol === 'CLIENTE') return !!u.localidadId && t.localidadId === u.localidadId;
    return true;
  }

  function ticketsVisibles(u) {
    return db.tickets.filter((t) => t.estado !== 'BORRADOR' && puedeVerTicket(t, u));
  }

  function borradoresDe(u) {
    return db.tickets
      .filter((t) => t.estado === 'BORRADOR' && t.creadoPorId === u.id)
      .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
  }

  function ticketPorNumero(numero) {
    const n = Number(numero);
    if (!Number.isInteger(n)) return null;
    return db.tickets.find((t) => t.numero === n) || null;
  }

  /** Busca un ticket por número respetando la visibilidad. */
  function ticketParaUsuario(numero, u) {
    const t = ticketPorNumero(numero);
    if (!t || t.estado === 'BORRADOR') return { error: 'no-existe' };
    if (!puedeVerTicket(t, u)) return { error: 'sin-acceso', ticket: t };
    return { ticket: t };
  }

  function borradorParaUsuario(id, u) {
    const t = ticket(id);
    if (!t || t.estado !== 'BORRADOR' || t.creadoPorId !== u.id) return null;
    return t;
  }

  /**
   * Lo privado es sólo para ORMEN: comentarios privados, motivos de
   * reapertura y de elevación, motivos de bloqueo privados y las propuestas
   * de solución.
   */
  const EVENTOS_SIN_TEXTO_PARA_CLIENTE = ['reapertura', 'cierre', 'elevado', 'desbloqueo'];
  function actividadVisible(t, u) {
    if (u.rol !== 'CLIENTE') return t.actividad.slice();
    return t.actividad
      .filter((ev) => !(ev.tipo === 'comentario' && ev.visibilidad === 'PRIVADO') && ev.tipo !== 'propuesta')
      .map((ev) => (EVENTOS_SIN_TEXTO_PARA_CLIENTE.includes(ev.tipo) || (ev.tipo === 'bloqueo' && ev.visibilidad === 'PRIVADO') ? Object.assign({}, ev, { texto: null }) : ev));
  }

  /** Imágenes del ticket y de los comentarios que el usuario puede ver. */
  function imagenesVisibles(t, u) {
    const lista = t.adjuntos.map((a) => Object.assign({ origen: 'Descripción' }, a));
    for (const ev of actividadVisible(t, u)) {
      if (ev.tipo === 'comentario' && ev.adjuntos && ev.adjuntos.length) {
        for (const a of ev.adjuntos) lista.push(Object.assign({ origen: ev.visibilidad === 'PRIVADO' ? 'Comentario privado' : 'Comentario público' }, a));
      }
    }
    if (u.rol !== 'CLIENTE' && t.solucion && t.solucion.adjuntos) {
      for (const a of t.solucion.adjuntos) lista.push(Object.assign({ origen: 'Solución' }, a));
    }
    return lista;
  }

  function esOrmen(u) {
    return !!u && (u.rol === 'OPERADOR' || u.rol === 'ADMINISTRADOR');
  }

  // ---------------------------------------------------------- Auditoría ---

  function auditar(usuarioId, operacion, ticketId, detalle) {
    db.auditoria.unshift({ id: U.uid('aud'), fecha: U.isoAhora(), usuarioId, operacion, ticketId: ticketId || null, detalle: detalle || '' });
    if (db.auditoria.length > MAX_AUDITORIA) db.auditoria.length = MAX_AUDITORIA;
  }

  /** Para operaciones fuera de una mutación (ingreso, salida, acceso denegado). */
  function registrarAuditoria(usuarioId, operacion, ticketId, detalle) {
    auditar(usuarioId, operacion, ticketId, detalle);
    escribir();
    programarSubida();
  }

  // -------------------------------------------------- Correos simulados ---

  /**
   * ORMEN: aviso por correo al creador cuando un operador actualiza el
   * ticket ("deseable, no obligatorio"). Sólo información pública. Si el
   * ticket lo creó ORMEN en nombre de la localidad no hay a quién avisar
   * (eso quedó pendiente de definir).
   */
  function enviarCorreo(t, actor, motivo, detalle) {
    const creador = usuario(t.creadoPorId);
    if (!creador || creador.rol !== 'CLIENTE' || creador.activo === false) return null;
    const { asunto, cuerpo } = D.componerCorreo({ ticket: t, destinatario: creador, actor, motivo, detalle });
    const correo = { id: U.uid('mail'), fecha: U.isoAhora(), ticketId: t.id, paraUsuarioId: creador.id, para: creador.email, asunto, cuerpo };
    db.correos.unshift(correo);
    if (db.correos.length > MAX_CORREOS) db.correos.length = MAX_CORREOS;
    return correo;
  }

  function correosPara(u) {
    if (u.rol === 'CLIENTE') return db.correos.filter((c) => c.paraUsuarioId === u.id);
    return db.correos.slice();
  }

  // -------------------------------------------------------- Validación ---

  const limpio = (v) => String(v == null ? '' : v).trim();

  /** Campos obligatorios para crear un ticket (HU01 y HU02). */
  function validarTicket(datos, u, opciones) {
    const op = opciones || {};
    const e = {};
    const loc = u.rol === 'CLIENTE' ? u.localidadId : datos.localidadId;
    const l = localidad(loc);
    if (!loc || !l) e.localidadId = 'Elegí la localidad.';
    else if (l.activa === false) e.localidadId = 'Esa localidad está inactiva.';
    const s = sistema(datos.sistemaId);
    if (!s || s.activo === false) e.sistemaId = 'Elegí el sistema o servicio afectado.';
    else if (datos.subsistemaId) {
      // ORMEN: "Subsistema en caso de corresponder" (no es obligatorio).
      const sub = subsistema(datos.subsistemaId);
      if (!sub || sub.sistemaId !== s.id || sub.activo === false) e.subsistemaId = 'Ese subsistema no corresponde al sistema elegido.';
    }
    if (!tipoSolicitud(datos.tipoSolicitudId)) e.tipoSolicitudId = 'Elegí el tipo de solicitud.';
    if (!criticidad(datos.criticidadId)) e.criticidadId = 'Elegí la criticidad.';
    if (!limpio(datos.titulo)) e.titulo = 'Escribí un título.';
    else if (limpio(datos.titulo).length > 120) e.titulo = 'El título puede tener hasta 120 caracteres.';
    if (!limpio(datos.descripcion)) e.descripcion = 'Describí el problema.';
    if (op.registroDirecto && !limpio(op.solucionTexto)) e.solucionTexto = 'Escribí la solución aplicada.';
    return e;
  }

  function normalizarPalabras(lista) {
    const vistas = new Set();
    const res = [];
    for (const p of lista || []) {
      const t = limpio(p).replace(/\s+/g, ' ');
      const k = U.normalizar(t);
      if (!k || vistas.has(k)) continue;
      vistas.add(k);
      res.push(t.toLowerCase());
    }
    return res;
  }

  function validarPropuesta(p) {
    const e = {};
    if (!limpio(p.titulo)) e.propuestaTitulo = 'Escribí un título para la solución.';
    if (!normalizarPalabras(p.palabrasClave).length) e.propuestaPalabras = 'Agregá al menos una palabra clave.';
    return e;
  }

  function copiarAdjuntos(lista, autorId, fecha) {
    return (lista || []).map((a) => ({ id: U.uid('img'), nombre: a.nombre || 'imagen', dataUrl: a.dataUrl, autorId, fecha }));
  }

  function datosTicket(datos, u) {
    return {
      titulo: limpio(datos.titulo),
      descripcion: limpio(datos.descripcion),
      localidadId: u.rol === 'CLIENTE' ? u.localidadId : datos.localidadId,
      sistemaId: datos.sistemaId,
      subsistemaId: datos.subsistemaId || null,
      tipoSolicitudId: datos.tipoSolicitudId,
      criticidadId: datos.criticidadId,
      tipoProblemaId: u.rol === 'OPERADOR' && datos.tipoProblemaId ? datos.tipoProblemaId : 'tp-nodef',
    };
  }

  function crearPropuesta(t, u, propuesta, solucionTexto, adjuntos, fecha) {
    const s = {
      id: U.uid('sol'),
      titulo: limpio(propuesta.titulo),
      descripcion: limpio(solucionTexto),
      sistemaId: t.sistemaId || null,
      subsistemaId: t.subsistemaId || null,
      palabrasClave: normalizarPalabras(propuesta.palabrasClave),
      estado: 'PENDIENTE',
      ticketOrigenId: t.id,
      creadaPorId: u.id,
      creadaEn: fecha,
      revisadaPorId: null,
      revisadaEn: null,
      motivoRechazo: null,
      actualizadaEn: fecha,
      adjuntos: (adjuntos || []).map((a) => Object.assign({}, a, { id: U.uid('img') })),
    };
    db.soluciones.push(s);
    evento(t, { tipo: 'propuesta', autorId: u.id, solucionId: s.id });
    auditar(u.id, 'SOLUCION_PROPUESTA', t.id, s.titulo);
    return s;
  }

  // ---------------------------------------------------- Alta de tickets ---

  /**
   * Crea un ticket: Abierto si lo crea un cliente; En proceso, atendido por
   * quien lo carga, si lo crea Mesa de ayuda. Con `registroDirecto` el
   * operador registra problema y solución y queda directamente Cerrado. Si
   * viene `borradorId`, el borrador se convierte en el ticket.
   */
  function crearTicket(datos, u, opciones) {
    const op = opciones || {};
    exigir(u && (u.rol === 'OPERADOR' || u.rol === 'CLIENTE'), 'Tu rol no puede crear tickets.');
    exigir(!op.registroDirecto || u.rol === 'OPERADOR', 'Sólo Mesa de ayuda puede registrar un ticket ya resuelto.');
    let errores = validarTicket(datos, u, op);
    if (op.registroDirecto && op.proponer) errores = Object.assign(errores, validarPropuesta(op.proponer));
    if (op.solucionCatalogoId) {
      const s = solucion(op.solucionCatalogoId);
      if (!s || s.estado !== 'APROBADA') errores.solucionTexto = 'La solución del catálogo elegida ya no está aprobada.';
    }
    if (Object.keys(errores).length) throw errorDeCampos(errores);
    if (op.borradorId) exigir(borradorParaUsuario(op.borradorId, u), 'El borrador ya no existe.');

    return mutar(() => {
      const ahora = U.isoAhora();
      const numero = db.secuencias.ticket++;
      const esOp = u.rol === 'OPERADOR';
      const t = Object.assign({ id: 't-' + numero, numero, estado: esOp ? 'EN_PROCESO' : 'ABIERTO' }, datosTicket(datos, u), {
        creadoPorId: u.id,
        operadorId: esOp ? u.id : null,
        elevadoA: null,
        creadoEn: ahora,
        actualizadoEn: ahora,
        cerradoEn: null,
        adjuntos: copiarAdjuntos(datos.adjuntos, u.id, ahora),
        solucion: null,
        registroDirecto: !!op.registroDirecto,
        actividad: [{ id: U.uid('a'), tipo: 'creado', fecha: ahora, autorId: u.id, estado: esOp ? 'EN_PROCESO' : 'ABIERTO', operadorId: esOp ? u.id : null, desdeBorrador: !!op.borradorId }],
      });
      if (op.borradorId) {
        db.tickets = db.tickets.filter((x) => x.id !== op.borradorId);
      }
      db.tickets.push(t);
      if (op.registroDirecto) {
        const adj = copiarAdjuntos(op.solucionAdjuntos, u.id, ahora);
        t.estado = 'CERRADO';
        t.cerradoEn = ahora;
        t.solucion = { texto: limpio(op.solucionTexto), adjuntos: adj, solucionCatalogoId: op.solucionCatalogoId || null, autorId: u.id, fecha: ahora };
        t.actividad.push({ id: U.uid('a'), tipo: 'cierre', fecha: ahora, autorId: u.id, de: null, registroDirecto: true });
        auditar(u.id, 'TICKET_CERRADO_DIRECTO', t.id, '#' + numero + ' · ' + t.titulo);
        if (op.proponer) crearPropuesta(t, u, op.proponer, op.solucionTexto, adj, ahora);
      } else {
        auditar(u.id, 'TICKET_CREADO', t.id, '#' + numero + ' · ' + t.titulo + (op.borradorId ? ' (desde un borrador)' : ''));
      }
      return t;
    });
  }

  // ------------------------------------------------------- Borradores ---

  function guardarBorrador(datos, u, id) {
    exigir(u && u.rol === 'OPERADOR', 'Sólo Mesa de ayuda usa borradores.');
    const tieneAlgo = ['titulo', 'descripcion', 'localidadId', 'sistemaId'].some((k) => limpio(datos[k])) || (datos.adjuntos && datos.adjuntos.length);
    if (!tieneAlgo) throw errorDeCampos({ descripcion: 'Para guardar un borrador escribí algo (por ejemplo, una nota en la descripción).' });
    return mutar(() => {
      const ahora = U.isoAhora();
      let b = id ? borradorParaUsuario(id, u) : null;
      exigir(!id || b, 'El borrador ya no existe.');
      const campos = {
        titulo: limpio(datos.titulo),
        descripcion: limpio(datos.descripcion),
        localidadId: datos.localidadId || '',
        sistemaId: datos.sistemaId || '',
        subsistemaId: datos.subsistemaId || '',
        tipoSolicitudId: datos.tipoSolicitudId || 'ts-atencion',
        criticidadId: datos.criticidadId || '',
        tipoProblemaId: datos.tipoProblemaId || 'tp-nodef',
      };
      if (!b) {
        b = Object.assign({
          id: U.uid('b'), numero: null, estado: 'BORRADOR', creadoPorId: u.id, operadorId: u.id,
          creadoEn: ahora, cerradoEn: null, solucion: null, registroDirecto: false, elevadoA: null, actividad: [], adjuntos: [],
        }, campos);
        db.tickets.push(b);
      } else {
        Object.assign(b, campos);
      }
      // Las imágenes ya guardadas conservan su id; las nuevas se agregan.
      const previas = new Map(b.adjuntos.map((a) => [a.id, a]));
      b.adjuntos = (datos.adjuntos || []).map((a) => previas.get(a.id) || { id: U.uid('img'), nombre: a.nombre || 'imagen', dataUrl: a.dataUrl, autorId: u.id, fecha: ahora });
      b.actualizadoEn = ahora;
      auditar(u.id, 'BORRADOR_GUARDADO', null, b.titulo || U.truncar(b.descripcion, 60) || 'Sin título');
      return b;
    });
  }

  function descartarBorrador(id, u) {
    return mutar(() => {
      const b = borradorParaUsuario(id, u);
      exigir(b, 'El borrador ya no existe.');
      db.tickets = db.tickets.filter((x) => x.id !== id);
      auditar(u.id, 'BORRADOR_DESCARTADO', null, b.titulo || U.truncar(b.descripcion, 60) || 'Sin título');
      return true;
    });
  }

  // ---------------------------------------------------- Tratamiento ---

  function ticketActivoParaOperador(ticketId, u) {
    const t = ticket(ticketId);
    exigir(t && t.estado !== 'BORRADOR', 'El ticket no existe.');
    exigir(u && u.rol === 'OPERADOR', 'Sólo Mesa de ayuda puede tratar tickets.');
    return t;
  }

  function evento(t, datos) {
    const ev = Object.assign({ id: U.uid('a'), fecha: U.isoAhora() }, datos);
    t.actividad.push(ev);
    t.actualizadoEn = ev.fecha;
    return ev;
  }

  /**
   * Comentario de un operador (público o privado, obligatorio elegir) o de
   * un cliente (siempre público). Un ticket cerrado hay que reabrirlo.
   */
  function comentar(ticketId, u, datos) {
    const t = ticket(ticketId);
    exigir(t && t.estado !== 'BORRADOR' && puedeVerTicket(t, u), 'El ticket no existe o no tenés acceso.');
    exigir(u.rol !== 'ADMINISTRADOR', 'En esta demo el administrador consulta los tickets pero no los trata.');
    exigir(t.estado !== 'CERRADO', u.rol === 'OPERADOR' ? 'El ticket está cerrado: reabrilo para agregar comentarios.' : 'El ticket está cerrado. Para agregar información, Mesa de ayuda tiene que reabrirlo.');
    const campos = {};
    const texto = limpio(datos.texto);
    if (!texto) campos.texto = 'Escribí el comentario.';
    const visibilidad = u.rol === 'CLIENTE' ? 'PUBLICO' : datos.visibilidad;
    if (visibilidad !== 'PUBLICO' && visibilidad !== 'PRIVADO') campos.visibilidad = 'Elegí si el comentario es público o privado.';
    if (Object.keys(campos).length) throw errorDeCampos(campos);
    return mutar(() => {
      const ahora = U.isoAhora();
      const ev = evento(t, { tipo: 'comentario', autorId: u.id, texto, visibilidad, adjuntos: copiarAdjuntos(datos.adjuntos, u.id, ahora) });
      auditar(u.id, visibilidad === 'PRIVADO' ? 'COMENTARIO_PRIVADO' : 'COMENTARIO_PUBLICO', t.id, U.truncar(texto, 90));
      if (u.rol === 'OPERADOR' && visibilidad === 'PUBLICO') enviarCorreo(t, u, 'comentario', 'Mensaje de Mesa de ayuda:\n"' + texto + '"');
      return ev;
    });
  }

  /**
   * "Atiende": quién de Mesa de ayuda tiene el ticket. Tomarlo o asignarlo
   * pasa un ticket Abierto a En proceso; uno Bloqueado sigue bloqueado.
   */
  function asignar(ticketId, u, operadorId) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado !== 'CERRADO', 'El ticket está cerrado.');
    const op = usuario(operadorId);
    exigir(op && op.rol === 'OPERADOR' && op.activo !== false, 'Elegí un operador activo.');
    exigir(t.operadorId !== operadorId, 'El ticket ya lo atiende ' + op.nombre + '.');
    return mutar(() => {
      const anteriorId = t.operadorId;
      const de = t.estado;
      t.operadorId = operadorId;
      if (de === 'ABIERTO') t.estado = 'EN_PROCESO';
      evento(t, { tipo: 'asignado', autorId: u.id, operadorId, anteriorId, de, a: t.estado });
      auditar(u.id, 'ASIGNACION', t.id, 'Atiende: ' + op.nombre + (de !== t.estado ? ' · ' + nombreEstado(de) + ' → ' + nombreEstado(t.estado) : ''));
      if (de !== t.estado) enviarCorreo(t, u, 'en-proceso', null);
      return t;
    });
  }

  /** Devuelve el ticket a la cola: nadie lo atiende y vuelve a Abierto. */
  function liberar(ticketId, u) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado === 'EN_PROCESO', 'Sólo se puede devolver a la cola un ticket En proceso.');
    return mutar(() => {
      const anteriorId = t.operadorId;
      t.operadorId = null;
      t.estado = 'ABIERTO';
      evento(t, { tipo: 'liberado', autorId: u.id, anteriorId, de: 'EN_PROCESO', a: 'ABIERTO' });
      auditar(u.id, 'LIBERACION', t.id, 'En proceso → Abierto · sin asignar');
      return t;
    });
  }

  /** Grupos de soporte y personas de Mesa de ayuda a las que se puede elevar. */
  function grupoSoporte(id) {
    return porId(db.gruposSoporte, id);
  }

  function destinoDesdeClave(clave) {
    const [tipo, id] = String(clave || '').split(':');
    if (tipo === 'grupo' && grupoSoporte(id)) return { tipo, id };
    if (tipo === 'usuario' && usuario(id)) return { tipo, id };
    return null;
  }

  function nombreDestino(d) {
    if (!d) return '—';
    if (d.tipo === 'grupo') return nombre('gruposSoporte', d.id, 'Grupo eliminado');
    const x = usuario(d.id);
    return x ? x.nombre : 'Usuario eliminado';
  }

  const mismoDestino = (a, b) => !!a && !!b && a.tipo === b.tipo && a.id === b.id;

  /**
   * Elevación: el ticket En proceso se deriva a un grupo de soporte o a otra
   * persona de Mesa de ayuda. Puede elevarse varias veces; `elevadoA` guarda
   * el último destino y la actividad, el recorrido completo. Si se eleva a
   * un operador, pasa a atenderlo esa persona.
   */
  function elevar(ticketId, u, datos) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado !== 'ABIERTO', 'Primero tomá el ticket: sólo se eleva un ticket En proceso.');
    exigir(t.estado !== 'BLOQUEADO', 'El ticket está bloqueado: desbloquealo antes de elevarlo.');
    exigir(t.estado === 'EN_PROCESO', 'Sólo se eleva un ticket En proceso.');
    const destino = destinoDesdeClave(datos && datos.destino);
    const e = {};
    if (!destino) e.destino = 'Elegí a quién se eleva.';
    else if (destino.tipo === 'grupo' && grupoSoporte(destino.id).activo === false) e.destino = 'Ese grupo está inactivo.';
    else if (destino.tipo === 'usuario') {
      const p = usuario(destino.id);
      if (p.rol !== 'OPERADOR' || p.activo === false) e.destino = 'Elegí un operador activo.';
      else if (p.id === t.operadorId) e.destino = 'Ya lo atiende ' + p.nombre + '.';
    }
    if (!e.destino && mismoDestino(destino, t.elevadoA)) e.destino = 'El ticket ya está elevado a ' + nombreDestino(destino) + '.';
    const motivo = limpio(datos && datos.motivo);
    if (!motivo) e.motivo = 'Escribí por qué se eleva.';
    if (Object.keys(e).length) throw errorDeCampos(e);
    return mutar(() => {
      const anterior = t.elevadoA || null;
      t.elevadoA = destino;
      if (destino.tipo === 'usuario') t.operadorId = destino.id;
      evento(t, { tipo: 'elevado', autorId: u.id, destino, anterior, texto: motivo });
      auditar(u.id, 'ELEVACION', t.id, 'Elevado a ' + nombreDestino(destino) + ' · ' + U.truncar(motivo, 70));
      enviarCorreo(t, u, 'elevado', 'Lo derivamos a ' + nombreDestino(destino) + ' para revisarlo. Te avisamos por acá apenas tengamos novedades.');
      return t;
    });
  }

  /** Bloqueado: detenido por un factor externo. El motivo es obligatorio. */
  function bloquear(ticketId, u, datos) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado !== 'ABIERTO', 'Primero tomá el ticket: sólo se bloquea un ticket En proceso.');
    exigir(t.estado === 'EN_PROCESO', 'El ticket ya está bloqueado.');
    const texto = limpio(datos && datos.texto);
    const e = {};
    if (!texto) e.texto = 'Escribí qué factor externo lo detiene.';
    if (datos.visibilidad !== 'PUBLICO' && datos.visibilidad !== 'PRIVADO') e.visibilidad = 'Elegí si el motivo es público o privado.';
    if (Object.keys(e).length) throw errorDeCampos(e);
    return mutar(() => {
      t.estado = 'BLOQUEADO';
      evento(t, { tipo: 'bloqueo', autorId: u.id, de: 'EN_PROCESO', a: 'BLOQUEADO', texto, visibilidad: datos.visibilidad });
      auditar(u.id, 'BLOQUEO', t.id, 'En proceso → Bloqueado · ' + U.truncar(texto, 70));
      enviarCorreo(t, u, 'bloqueado', datos.visibilidad === 'PUBLICO' ? 'Mensaje de Mesa de ayuda:\n"' + texto + '"' : null);
      return t;
    });
  }

  function desbloquear(ticketId, u, datos) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado === 'BLOQUEADO', 'El ticket no está bloqueado.');
    const texto = limpio(datos && datos.texto);
    return mutar(() => {
      t.estado = 'EN_PROCESO';
      evento(t, { tipo: 'desbloqueo', autorId: u.id, de: 'BLOQUEADO', a: 'EN_PROCESO', texto: texto || null });
      auditar(u.id, 'DESBLOQUEO', t.id, 'Bloqueado → En proceso' + (texto ? ' · ' + U.truncar(texto, 70) : ''));
      enviarCorreo(t, u, 'estado', null);
      return t;
    });
  }

  const CAMPOS_CLASIFICACION = [
    ['sistemaId', 'Sistema', 'sistemas'],
    ['subsistemaId', 'Subsistema', 'subsistemas'],
    ['tipoSolicitudId', 'Tipo de solicitud', 'tiposSolicitud'],
    ['criticidadId', 'Criticidad', 'criticidades'],
    ['tipoProblemaId', 'Tipo de problema', 'tiposProblema'],
  ];

  /** Reclasificación por parte del operador (sistema, criticidad, tipo de problema...). */
  function modificarClasificacion(ticketId, u, datos) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado !== 'CERRADO', 'El ticket está cerrado: reabrilo para modificarlo.');
    const e = {};
    const s = sistema(datos.sistemaId);
    if (!s) e.sistemaId = 'Elegí el sistema o servicio afectado.';
    else if (datos.subsistemaId) {
      const sub = subsistema(datos.subsistemaId);
      if (!sub || sub.sistemaId !== s.id) e.subsistemaId = 'Ese subsistema no corresponde al sistema elegido.';
    }
    if (!tipoSolicitud(datos.tipoSolicitudId)) e.tipoSolicitudId = 'Elegí el tipo de solicitud.';
    if (!criticidad(datos.criticidadId)) e.criticidadId = 'Elegí la criticidad.';
    if (!tipoProblema(datos.tipoProblemaId)) e.tipoProblemaId = 'Elegí el tipo de problema.';
    if (Object.keys(e).length) throw errorDeCampos(e);
    const cambios = [];
    for (const [campo, etiqueta, col] of CAMPOS_CLASIFICACION) {
      const nuevo = datos[campo] || null;
      if ((t[campo] || null) !== nuevo) cambios.push({ campo, etiqueta, de: nombre(col, t[campo], '—'), a: nombre(col, nuevo, '—') });
    }
    exigir(cambios.length, 'No hay cambios para guardar.');
    return mutar(() => {
      for (const [campo] of CAMPOS_CLASIFICACION) t[campo] = datos[campo] || null;
      evento(t, { tipo: 'datos', autorId: u.id, cambios });
      auditar(u.id, 'DATOS', t.id, cambios.map((c) => c.etiqueta + ': ' + c.de + ' → ' + c.a).join(' · '));
      return t;
    });
  }

  /**
   * Cierre: todo ticket cerrado tiene su solución (ORMEN). Se puede cerrar
   * desde cualquier estado activo. El operador puede proponerla como
   * solución: queda como borrador hasta que un administrador la apruebe.
   */
  function cerrar(ticketId, u, datos) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado !== 'CERRADO', 'El ticket ya está cerrado.');
    let e = {};
    if (!limpio(datos.texto)) e.solucionTexto = 'Escribí la solución aplicada.';
    if (datos.solucionCatalogoId) {
      const s = solucion(datos.solucionCatalogoId);
      if (!s || s.estado !== 'APROBADA') e.solucionTexto = 'La solución del catálogo elegida ya no está aprobada.';
    }
    if (datos.tipoProblemaId && !tipoProblema(datos.tipoProblemaId)) e.tipoProblemaId = 'Elegí el tipo de problema.';
    if (datos.proponer) e = Object.assign(e, validarPropuesta(datos.proponer));
    if (Object.keys(e).length) throw errorDeCampos(e);
    return mutar(() => {
      const ahora = U.isoAhora();
      const mensaje = limpio(datos.mensajePublico);
      if (mensaje) {
        evento(t, { tipo: 'comentario', autorId: u.id, texto: mensaje, visibilidad: 'PUBLICO', adjuntos: [] });
        auditar(u.id, 'COMENTARIO_PUBLICO', t.id, U.truncar(mensaje, 90));
      }
      const de = t.estado;
      const adj = copiarAdjuntos(datos.adjuntos, u.id, ahora);
      t.estado = 'CERRADO';
      t.cerradoEn = ahora;
      if (datos.tipoProblemaId) t.tipoProblemaId = datos.tipoProblemaId;
      if (!t.operadorId) t.operadorId = u.id;
      t.solucion = { texto: limpio(datos.texto), adjuntos: adj, solucionCatalogoId: datos.solucionCatalogoId || null, autorId: u.id, fecha: ahora };
      evento(t, { tipo: 'cierre', autorId: u.id, de, texto: limpio(datos.texto) });
      auditar(u.id, 'CIERRE', t.id, nombreEstado(de) + ' → Cerrado');
      enviarCorreo(t, u, 'cierre', mensaje ? 'Mensaje de Mesa de ayuda:\n"' + mensaje + '"' : null);
      let propuesta = null;
      if (datos.proponer) propuesta = crearPropuesta(t, u, datos.proponer, datos.texto, adj, ahora);
      return { ticket: t, propuesta };
    });
  }

  /**
   * ORMEN: "luego de cerrado se tendría que reabrir para ingresar nuevos
   * comentarios". Vuelve a En proceso y lo atiende quien lo reabre.
   */
  function reabrir(ticketId, u, datos) {
    const t = ticketActivoParaOperador(ticketId, u);
    exigir(t.estado === 'CERRADO', 'Sólo se puede reabrir un ticket cerrado.');
    const motivo = limpio(datos && datos.motivo);
    return mutar(() => {
      t.estado = 'EN_PROCESO';
      t.cerradoEn = null;
      t.operadorId = u.id;
      evento(t, { tipo: 'reapertura', autorId: u.id, de: 'CERRADO', a: 'EN_PROCESO', operadorId: u.id, texto: motivo || null });
      auditar(u.id, 'REAPERTURA', t.id, 'Cerrado → En proceso' + (motivo ? ' · ' + U.truncar(motivo, 70) : ''));
      enviarCorreo(t, u, 'reapertura', null);
      return t;
    });
  }

  /**
   * Recorrido del ticket: por qué responsables (cola, personas, grupos) y
   * estados pasó, armado a partir de la actividad. Cada paso dura hasta el
   * siguiente; el último sigue abierto (hasta = null) salvo que esté cerrado.
   */
  const COLA = { tipo: 'cola', id: 'cola' };

  function recorrido(t) {
    const pasos = [];
    let resp = COLA;
    let estado = 'ABIERTO';
    function paso(ev, motivo) {
      const ult = pasos[pasos.length - 1];
      if (ult && ult.estado === estado && ult.responsable.tipo === resp.tipo && ult.responsable.id === resp.id) return;
      if (ult) ult.hasta = ev.fecha;
      pasos.push({ responsable: resp, estado, desde: ev.fecha, hasta: null, motivo, autorId: ev.autorId, texto: ev.texto || null, visibilidad: ev.visibilidad || null });
    }
    const persona = (id) => (id ? { tipo: 'usuario', id } : COLA);
    for (const ev of t.actividad) {
      if (ev.tipo === 'creado') {
        estado = ev.estado || 'ABIERTO';
        resp = estado === 'ABIERTO' ? COLA : persona(ev.operadorId || ev.autorId);
        paso(ev, 'creado');
      } else if (ev.tipo === 'asignado') {
        resp = persona(ev.operadorId);
        if (ev.a) estado = ev.a;
        paso(ev, ev.operadorId === ev.autorId ? 'tomado' : 'asignado');
      } else if (ev.tipo === 'liberado') {
        resp = COLA; estado = 'ABIERTO'; paso(ev, 'liberado');
      } else if (ev.tipo === 'elevado') {
        resp = ev.destino; paso(ev, 'elevado');
      } else if (ev.tipo === 'bloqueo') {
        estado = 'BLOQUEADO'; paso(ev, 'bloqueo');
      } else if (ev.tipo === 'desbloqueo') {
        estado = 'EN_PROCESO'; paso(ev, 'desbloqueo');
      } else if (ev.tipo === 'cierre') {
        resp = persona(ev.autorId); estado = 'CERRADO'; paso(ev, ev.registroDirecto ? 'registroDirecto' : 'cierre');
      } else if (ev.tipo === 'reapertura') {
        resp = persona(ev.operadorId || ev.autorId); estado = 'EN_PROCESO'; paso(ev, 'reapertura');
      }
    }
    const ult = pasos[pasos.length - 1];
    if (ult && ult.estado === 'CERRADO') ult.hasta = ult.desde;
    return pasos;
  }

  /** Nombre de quien tiene el ticket en un paso del recorrido. */
  function nombreResponsable(r) {
    if (!r || r.tipo === 'cola') return 'Cola de Mesa de ayuda';
    return nombreDestino(r);
  }

  // ------------------------------------------- Del ticket a la solución ---

  /** Borrador o solución aprobada que surgió del ticket (las rechazadas no cuentan). */
  function propuestaDeTicket(t) {
    return db.soluciones.find((s) => s.ticketOrigenId === t.id && s.estado !== 'RECHAZADA') || null;
  }

  /** Solución aprobada que surgió del ticket (para el destacado). */
  function solucionOriginadaPor(t) {
    return db.soluciones.find((s) => s.ticketOrigenId === t.id && s.estado === 'APROBADA') || null;
  }

  /**
   * "Proponer como solución" desde un ticket cerrado: crea un borrador de
   * solución independiente del ticket, que un administrador revisa, edita y
   * aprueba. El ticket queda como está.
   */
  function proponerSolucion(ticketId, u, datos) {
    const t = ticket(ticketId);
    exigir(t && t.estado !== 'BORRADOR', 'El ticket no existe.');
    exigir(esOrmen(u), 'Sólo ORMEN puede proponer soluciones.');
    exigir(t.estado === 'CERRADO' && t.solucion, 'Sólo se propone como solución un ticket cerrado.');
    const previa = propuestaDeTicket(t);
    exigir(!previa, previa && previa.estado === 'APROBADA' ? 'De este ticket ya surgió una solución.' : 'Este ticket ya tiene un borrador de solución esperando revisión.');
    const e = validarPropuesta({ titulo: datos.titulo, palabrasClave: datos.palabrasClave });
    if (!limpio(datos.descripcion)) e.propuestaDescripcion = 'Escribí la solución (los pasos a seguir).';
    if (Object.keys(e).length) throw errorDeCampos(e);
    return mutar(() => crearPropuesta(t, u, datos, datos.descripcion, t.solucion.adjuntos, U.isoAhora()));
  }

  // --------------------------------------------------------- Soluciones ---

  function soluciones(filtro) {
    let l = db.soluciones.slice();
    if (filtro && filtro.estado) l = l.filter((s) => s.estado === filtro.estado);
    return l;
  }

  function usosDeSolucion(id) {
    return db.tickets.filter((t) => t.estado === 'CERRADO' && t.solucion && t.solucion.solucionCatalogoId === id);
  }

  function contarUsos() {
    const m = new Map();
    for (const t of db.tickets) {
      if (t.estado === 'CERRADO' && t.solucion && t.solucion.solucionCatalogoId) {
        m.set(t.solucion.solucionCatalogoId, (m.get(t.solucion.solucionCatalogoId) || 0) + 1);
      }
    }
    return m;
  }

  function validarSolucion(datos) {
    const e = {};
    if (!limpio(datos.titulo)) e.titulo = 'Escribí un título.';
    if (!limpio(datos.descripcion)) e.descripcion = 'Escribí la solución (los pasos a seguir).';
    if (datos.sistemaId && !sistema(datos.sistemaId)) e.sistemaId = 'El sistema no existe.';
    if (datos.subsistemaId) {
      const sub = subsistema(datos.subsistemaId);
      if (!sub || sub.sistemaId !== datos.sistemaId) e.subsistemaId = 'El subsistema no corresponde al sistema elegido.';
    }
    if (!normalizarPalabras(datos.palabrasClave).length) e.palabrasClave = 'Agregá al menos una palabra clave.';
    return e;
  }

  /**
   * Alta o edición de una solución del catálogo.
   * - Administrador: queda aprobada.
   * - Operador: queda pendiente de aprobación (supuesto: mismo circuito que
   *   las soluciones que vienen de un ticket).
   * Sólo el administrador edita soluciones existentes.
   */
  function guardarSolucion(datos, u, id) {
    exigir(esOrmen(u), 'Las soluciones son para Mesa de ayuda y gestión de ORMEN.');
    const e = validarSolucion(datos);
    if (Object.keys(e).length) throw errorDeCampos(e);
    const existente = id ? solucion(id) : null;
    exigir(!id || existente, 'La solución no existe.');
    exigir(!existente || u.rol === 'ADMINISTRADOR', 'Sólo un administrador puede modificar soluciones del catálogo.');
    return mutar(() => {
      const ahora = U.isoAhora();
      const campos = {
        titulo: limpio(datos.titulo),
        descripcion: limpio(datos.descripcion),
        sistemaId: datos.sistemaId || null,
        subsistemaId: datos.subsistemaId || null,
        palabrasClave: normalizarPalabras(datos.palabrasClave),
      };
      if (existente) {
        const previas = new Map(existente.adjuntos.map((a) => [a.id, a]));
        Object.assign(existente, campos, {
          actualizadaEn: ahora,
          adjuntos: (datos.adjuntos || []).map((a) => previas.get(a.id) || { id: U.uid('img'), nombre: a.nombre || 'imagen', dataUrl: a.dataUrl, autorId: u.id, fecha: ahora }),
        });
        auditar(u.id, 'SOLUCION_EDITADA', existente.ticketOrigenId, existente.titulo);
        return existente;
      }
      const admin = u.rol === 'ADMINISTRADOR';
      const s = Object.assign({ id: U.uid('sol') }, campos, {
        estado: admin ? 'APROBADA' : 'PENDIENTE',
        ticketOrigenId: null,
        creadaPorId: u.id,
        creadaEn: ahora,
        revisadaPorId: admin ? u.id : null,
        revisadaEn: admin ? ahora : null,
        motivoRechazo: null,
        actualizadaEn: ahora,
        adjuntos: copiarAdjuntos(datos.adjuntos, u.id, ahora),
      });
      db.soluciones.push(s);
      auditar(u.id, admin ? 'SOLUCION_CREADA' : 'SOLUCION_PROPUESTA', null, s.titulo);
      return s;
    });
  }

  function revisarSolucion(id, u, aprobar, motivo, cambios) {
    exigir(u && u.rol === 'ADMINISTRADOR', 'Sólo un administrador puede aprobar o rechazar soluciones.');
    const s = solucion(id);
    exigir(s, 'La solución no existe.');
    exigir(s.estado === 'PENDIENTE', 'La solución ya fue revisada.');
    if (!aprobar && !limpio(motivo)) throw errorDeCampos({ motivo: 'Escribí el motivo del rechazo.' });
    if (aprobar && cambios) {
      const e = validarSolucion(Object.assign({}, s, cambios));
      if (Object.keys(e).length) throw errorDeCampos(e);
    }
    return mutar(() => {
      const ahora = U.isoAhora();
      if (aprobar && cambios) {
        Object.assign(s, {
          titulo: limpio(cambios.titulo), descripcion: limpio(cambios.descripcion),
          sistemaId: cambios.sistemaId || null, subsistemaId: cambios.subsistemaId || null,
          palabrasClave: normalizarPalabras(cambios.palabrasClave),
        });
      }
      s.estado = aprobar ? 'APROBADA' : 'RECHAZADA';
      s.revisadaPorId = u.id;
      s.revisadaEn = ahora;
      s.actualizadaEn = ahora;
      s.motivoRechazo = aprobar ? null : limpio(motivo);
      auditar(u.id, aprobar ? 'SOLUCION_APROBADA' : 'SOLUCION_RECHAZADA', s.ticketOrigenId, s.titulo + (aprobar ? '' : ' · ' + U.truncar(motivo, 70)));
      return s;
    });
  }

  const aprobarSolucion = (id, u, cambios) => revisarSolucion(id, u, true, null, cambios);
  const rechazarSolucion = (id, u, motivo) => revisarSolucion(id, u, false, motivo);

  // ------------------------------------------------------ Administración ---

  function exigirAdmin(u) {
    exigir(u && u.rol === 'ADMINISTRADOR', 'Sólo un administrador puede hacer este cambio.');
  }

  function guardarUsuario(datos, admin, id) {
    exigirAdmin(admin);
    const existente = id ? usuario(id) : null;
    exigir(!id || existente, 'El usuario no existe.');
    const e = {};
    const nombreU = limpio(datos.nombre);
    const login = limpio(datos.usuario).toLowerCase();
    const email = limpio(datos.email).toLowerCase();
    if (!nombreU) e.nombre = 'Escribí el nombre.';
    if (!login) e.usuario = 'Escribí el nombre de usuario.';
    else if (!/^[a-z0-9._-]{3,30}$/.test(login)) e.usuario = 'Usá entre 3 y 30 letras sin tildes, números, punto o guion.';
    else if (db.usuarios.some((x) => x.usuario === login && x.id !== id)) e.usuario = 'Ya existe un usuario con ese nombre.';
    if (!email) e.email = 'Escribí el correo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'El correo no tiene un formato válido.';
    if (!D.ROLES[datos.rol]) e.rol = 'Elegí el rol.';
    if (datos.rol === 'CLIENTE') {
      const l = localidad(datos.localidadId);
      if (!l) e.localidadId = 'Un cliente tiene que pertenecer a una localidad.';
      else if (l.activa === false && (!existente || existente.localidadId !== l.id)) e.localidadId = 'Esa localidad está inactiva.';
    }
    if (existente && existente.id === admin.id && datos.rol !== 'ADMINISTRADOR') e.rol = 'No podés quitarte el rol de administrador.';
    if (Object.keys(e).length) throw errorDeCampos(e);
    return mutar(() => {
      const campos = {
        nombre: nombreU, usuario: login, email, rol: datos.rol,
        localidadId: datos.rol === 'CLIENTE' ? datos.localidadId : null,
        cargo: limpio(datos.cargo),
      };
      if (existente) {
        Object.assign(existente, campos);
        auditar(admin.id, 'USUARIO_MODIF', null, existente.nombre + ' (' + D.ROLES[existente.rol].nombre + ')');
        return existente;
      }
      const u = Object.assign({ id: U.uid('u'), activo: true, creadoEn: U.isoAhora() }, campos);
      db.usuarios.push(u);
      auditar(admin.id, 'USUARIO_ALTA', null, u.nombre + ' (' + D.ROLES[u.rol].nombre + ')');
      return u;
    });
  }

  function cambiarActivoUsuario(id, admin, activo) {
    exigirAdmin(admin);
    const u = usuario(id);
    exigir(u, 'El usuario no existe.');
    exigir(u.id !== admin.id, 'No podés desactivar tu propio usuario.');
    return mutar(() => {
      u.activo = !!activo;
      auditar(admin.id, 'USUARIO_MODIF', null, u.nombre + (activo ? ' · activado' : ' · desactivado'));
      return u;
    });
  }

  function guardarLocalidad(datos, admin, id) {
    exigirAdmin(admin);
    const existente = id ? localidad(id) : null;
    exigir(!id || existente, 'La localidad no existe.');
    const n = limpio(datos.nombre);
    if (!n) throw errorDeCampos({ nombre: 'Escribí el nombre de la localidad.' });
    if (db.localidades.some((l) => U.normalizar(l.nombre) === U.normalizar(n) && l.id !== id)) throw errorDeCampos({ nombre: 'Ya existe una localidad con ese nombre.' });
    return mutar(() => {
      if (existente) {
        const antes = existente.nombre;
        existente.nombre = n;
        auditar(admin.id, 'LOCALIDAD_MODIF', null, antes === n ? n : antes + ' → ' + n);
        return existente;
      }
      const l = { id: U.uid('loc'), nombre: n, activa: true };
      db.localidades.push(l);
      auditar(admin.id, 'LOCALIDAD_ALTA', null, n);
      return l;
    });
  }

  function cambiarActivaLocalidad(id, admin, activa) {
    exigirAdmin(admin);
    const l = localidad(id);
    exigir(l, 'La localidad no existe.');
    return mutar(() => {
      l.activa = !!activa;
      auditar(admin.id, 'LOCALIDAD_MODIF', null, l.nombre + (activa ? ' · activada' : ' · desactivada'));
      return l;
    });
  }

  const NOMBRES_CATALOGO = {
    sistemas: 'Sistemas',
    subsistemas: 'Subsistemas',
    tiposProblema: 'Tipos de problema',
    criticidades: 'Criticidades',
    tiposSolicitud: 'Tipos de solicitud',
    gruposSoporte: 'Grupos de soporte',
  };

  function guardarItemCatalogo(tipo, datos, admin, id) {
    exigirAdmin(admin);
    exigir(NOMBRES_CATALOGO[tipo], 'Catálogo desconocido.');
    const lista = db[tipo];
    const existente = id ? porId(lista, id) : null;
    exigir(!id || existente, 'El elemento no existe.');
    const n = limpio(datos.nombre);
    if (!n) throw errorDeCampos({ nombre: 'Escribí el nombre.' });
    const sistemaId = tipo === 'subsistemas' ? (existente ? existente.sistemaId : datos.sistemaId) : null;
    if (tipo === 'subsistemas' && !sistema(sistemaId)) throw errorDeCampos({ nombre: 'Elegí el sistema.' });
    const repetido = lista.some((x) => x.id !== id && U.normalizar(x.nombre) === U.normalizar(n) && (tipo !== 'subsistemas' || x.sistemaId === sistemaId));
    if (repetido) throw errorDeCampos({ nombre: 'Ya existe un elemento con ese nombre.' });
    return mutar(() => {
      if (existente) {
        const antes = existente.nombre;
        existente.nombre = n;
        if (tipo === 'subsistemas' || tipo === 'gruposSoporte') existente.ejemplo = false;
        auditar(admin.id, 'CATALOGO', null, NOMBRES_CATALOGO[tipo] + ': ' + (antes === n ? n : antes + ' → ' + n));
        return existente;
      }
      const prefijos = { sistemas: 'sis', subsistemas: 'sub', tiposProblema: 'tp', criticidades: 'cri', tiposSolicitud: 'ts', gruposSoporte: 'gs' };
      const item = { id: U.uid(prefijos[tipo]), nombre: n, activo: true };
      if (tipo === 'subsistemas') Object.assign(item, { sistemaId, ejemplo: false });
      if (tipo === 'criticidades') Object.assign(item, { orden: lista.length + 1, clase: '' });
      lista.push(item);
      auditar(admin.id, 'CATALOGO', null, NOMBRES_CATALOGO[tipo] + ': alta de ' + n);
      return item;
    });
  }

  function cambiarActivoItem(tipo, id, admin, activo) {
    exigirAdmin(admin);
    const item = porId(db[tipo] || [], id);
    exigir(item, 'El elemento no existe.');
    return mutar(() => {
      item.activo = !!activo;
      auditar(admin.id, 'CATALOGO', null, NOMBRES_CATALOGO[tipo] + ': ' + item.nombre + (activo ? ' · activado' : ' · desactivado'));
      return item;
    });
  }

  const LIMITES_PARAMETROS = {
    pesoSistema: [0, 10], pesoSubsistema: [0, 10], pesoPalabraClave: [0, 10],
    pesoLocalidad: [0, 10], pesoPalabraComun: [0, 10], maxResultados: [1, 15],
  };

  function guardarParametros(p, admin) {
    exigirAdmin(admin);
    const e = {};
    const nuevos = {};
    for (const k of Object.keys(LIMITES_PARAMETROS)) {
      const [min, max] = LIMITES_PARAMETROS[k];
      const v = Number(p[k]);
      if (!Number.isFinite(v) || v < min || v > max || Math.round(v) !== v) e[k] = 'Usá un número entero entre ' + min + ' y ' + max + '.';
      else nuevos[k] = v;
    }
    if (Object.keys(e).length) throw errorDeCampos(e);
    return mutar(() => {
      const cambios = Object.keys(nuevos).filter((k) => db.parametros[k] !== nuevos[k]).map((k) => k + ': ' + db.parametros[k] + ' → ' + nuevos[k]);
      db.parametros = Object.assign({}, db.parametros, nuevos);
      auditar(admin.id, 'PARAMETROS', null, cambios.length ? cambios.join(' · ') : 'Sin cambios');
      return db.parametros;
    });
  }

  App.store = {
    ErrorDemo,
    iniciar, alCambiar, restablecer, registrarAuditoria, estadoRemoto, alCambiarRemoto, sincronizar,
    get datos() { return db; },
    get almacenamientoDisponible() { return disponible; },
    // consultas
    usuario, localidad, sistema, subsistema, tipoProblema, criticidad, tipoSolicitud, solucion, ticket,
    nombre, nombreEstado, etiquetaUsuario, esOrmen,
    usuarios, operadores, localidades, sistemas, subsistemasDe, catalogo,
    puedeVerTicket, ticketsVisibles, borradoresDe, ticketPorNumero, ticketParaUsuario, borradorParaUsuario,
    actividadVisible, imagenesVisibles, correosPara,
    grupoSoporte, nombreDestino, recorrido, nombreResponsable,
    soluciones, usosDeSolucion, contarUsos, propuestaDeTicket, solucionOriginadaPor,
    validarTicket, normalizarPalabras,
    // tickets
    crearTicket, guardarBorrador, descartarBorrador,
    comentar, asignar, liberar, elevar, bloquear, desbloquear, modificarClasificacion, cerrar, reabrir,
    // soluciones
    proponerSolucion, guardarSolucion, aprobarSolucion, rechazarSolucion,
    // administración
    guardarUsuario, cambiarActivoUsuario, guardarLocalidad, cambiarActivaLocalidad,
    guardarItemCatalogo, cambiarActivoItem, guardarParametros,
    LIMITES_PARAMETROS, NOMBRES_CATALOGO,
  };
})(window.App = window.App || {});
