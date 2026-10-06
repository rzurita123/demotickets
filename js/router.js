/* ==========================================================================
   Navegación por hash (#/tickets/1005). Funciona abriendo index.html desde
   el disco y en cualquier hosting estático (Vercel incluido) sin
   configurar reescrituras.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const rutas = [];
  let actual = null;
  let limpiezas = [];
  let sucio = false;

  /** registrar('/tickets/:numero', { vista, roles, titulo, publica, sinMarco, soloSinSesion, seccion }) */
  function registrar(patron, def) {
    const claves = [];
    const fuente = patron.replace(/\//g, '\\/').replace(/:(\w+)/g, (_, k) => { claves.push(k); return '([^/]+)'; });
    rutas.push(Object.assign({ patron, re: new RegExp('^' + fuente + '\\/?$'), claves }, def));
  }

  function parsear() {
    const crudo = location.hash.replace(/^#/, '') || '/';
    const i = crudo.indexOf('?');
    const ruta = (i >= 0 ? crudo.slice(0, i) : crudo) || '/';
    const qs = i >= 0 ? crudo.slice(i + 1) : '';
    return { ruta: ruta.charAt(0) === '/' ? ruta : '/' + ruta, query: U.parseQuery(qs), hash: crudo };
  }

  function resolver(ruta) {
    for (const r of rutas) {
      const m = r.re.exec(ruta);
      if (m) {
        const params = {};
        r.claves.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { def: r, params };
      }
    }
    return null;
  }

  function ejecutarLimpiezas() {
    const fns = limpiezas;
    limpiezas = [];
    for (const fn of fns) {
      try { fn(); } catch (e) { console.error(e); }
    }
  }

  function ir(destino, op) {
    const o = op || {};
    const hash = '#' + destino;
    if (o.reemplazar) {
      history.replaceState(null, '', hash);
      procesar(o);
    } else if (location.hash === hash) {
      procesar(o);
    } else {
      location.hash = destino;
    }
  }

  let confirmando = false;
  async function procesar(op) {
    const destino = parsear();
    if (sucio && actual && destino.hash !== actual.hash) {
      if (confirmando) return;
      confirmando = true;
      const ok = await App.ui.confirmar({
        titulo: 'Tenés cambios sin guardar',
        mensaje: 'Si salís de esta pantalla se pierde lo que cargaste.',
        textoCancelar: 'Seguir editando',
        textoConfirmar: 'Salir sin guardar',
        peligro: true,
      });
      confirmando = false;
      if (!ok) {
        history.replaceState(null, '', '#' + actual.hash);
        return;
      }
    }
    renderizar(destino, op);
  }

  function renderizar(destino, op) {
    const o = op || {};
    ejecutarLimpiezas();
    sucio = false;
    App.charts.ocultarTooltip();
    if (!o.suave) App.ui.cerrarModales();
    const usuario = App.auth.usuarioActual();
    const r = resolver(destino.ruta);
    let def;
    let params = {};

    if (!r) {
      def = { vista: App.vistas.noEncontrado, titulo: 'Página no encontrada', publica: true };
    } else if (!r.def.publica && !usuario) {
      const volver = destino.hash !== '/' ? '?volver=' + encodeURIComponent(destino.hash) : '';
      ir('/ingresar' + volver, { reemplazar: true });
      return;
    } else if (r.def.soloSinSesion && usuario) {
      ir('/', { reemplazar: true });
      return;
    } else if (r.def.roles && !r.def.roles.includes(usuario.rol)) {
      App.store.registrarAuditoria(usuario.id, 'ACCESO_DENEGADO', null, 'Intentó abrir la pantalla ' + destino.ruta);
      def = { vista: App.vistas.sinAcceso, titulo: 'Sin acceso' };
    } else {
      def = r.def;
      params = r.params;
    }

    actual = { hash: destino.hash, ruta: destino.ruta, query: destino.query, params, def };
    const ctx = {
      usuario,
      params,
      query: destino.query,
      ruta: destino.ruta,
      hash: destino.hash,
      def,
      alSalir(fn) { limpiezas.push(fn); },
      marcarSucio(v) { sucio = v !== false; },
      refrescar(op2) { refrescar(op2); },
      titulo(t) { ctx._titulo = t; document.title = t + ' · Tickets ORMEN (demo)'; },
      _titulo: null,
    };
    let nodo;
    try {
      nodo = def.vista(ctx);
    } catch (e) {
      console.error(e);
      nodo = App.vistas.error(e);
    }
    App.layout.montar(nodo, { usuario, def, ctx });
    document.title = (ctx._titulo || def.titulo || 'Inicio') + ' · Tickets ORMEN (demo)';

    if (o.suave) {
      if (o.scroll != null) window.scrollTo(0, o.scroll);
    } else {
      window.scrollTo(0, 0);
      if (!o.inicial) {
        const h1 = document.getElementById('titulo-pagina');
        if (h1) h1.focus({ preventScroll: true });
      }
    }
    if (o.enfocar) {
      const el = U.$(o.enfocar);
      if (el) el.focus({ preventScroll: !!o.suave });
    }
  }

  /** Vuelve a dibujar la pantalla actual conservando el scroll. */
  function refrescar(op) {
    const y = window.scrollY;
    renderizar(parsear(), Object.assign({ suave: true, scroll: y }, op || {}));
  }

  /** Cambia los filtros en la URL sin volver a dibujar la pantalla. */
  function actualizarQuery(query) {
    if (!actual) return;
    const qs = U.buildQuery(query);
    const hash = actual.ruta + (qs ? '?' + qs : '');
    history.replaceState(null, '', '#' + hash);
    actual.hash = hash;
    actual.query = query;
  }

  function iniciar() {
    window.addEventListener('hashchange', () => procesar());
    window.addEventListener('beforeunload', (e) => {
      if (!sucio) return;
      e.preventDefault();
      e.returnValue = '';
    });
    renderizar(parsear(), { inicial: true });
  }

  App.router = {
    registrar, ir, refrescar, actualizarQuery, iniciar,
    get actual() { return actual; },
    estaSucio: () => sucio,
    /** Olvida los cambios sin guardar (por ejemplo, al restablecer la demo). */
    descartarCambios() { sucio = false; },
  };
})(window.App = window.App || {});
