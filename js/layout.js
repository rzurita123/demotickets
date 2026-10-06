/* ==========================================================================
   Marco de la aplicación: barra superior con la navegación de cada rol,
   menú del usuario, franja de demo y pie.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  function navegacion(u) {
    const S = App.store;
    const empieza = (p) => (r) => r === p || r.indexOf(p + '/') === 0;
    if (u.rol === 'CLIENTE') {
      return [
        { href: '#/', texto: 'Inicio', icono: 'inicio', activo: (r) => r === '/' },
        { href: '#/tickets', texto: 'Tickets', icono: 'lista', activo: (r) => empieza('/tickets')(r) && r !== '/tickets/nuevo' },
        { href: '#/tickets/nuevo', texto: 'Nuevo ticket', icono: 'mas', activo: (r) => r === '/tickets/nuevo' },
        { href: '#/estadisticas', texto: 'Estadísticas', icono: 'grafico', activo: empieza('/estadisticas') },
      ];
    }
    if (u.rol === 'OPERADOR') {
      const sinAsignar = S.ticketsVisibles(u).filter((t) => App.dominio.ESTADOS_ACTIVOS.includes(t.estado) && !t.operadorId).length;
      const borradores = S.borradoresDe(u).length;
      return [
        { href: '#/', texto: 'Inicio', icono: 'inicio', activo: (r) => r === '/' },
        { href: '#/tickets', texto: 'Tickets', icono: 'lista', activo: (r) => empieza('/tickets')(r) && r !== '/tickets/nuevo', contador: sinAsignar, contadorTitulo: U.plural(sinAsignar, 'ticket sin asignar', 'tickets sin asignar') },
        { href: '#/borradores', texto: 'Borradores', icono: 'borrador', activo: empieza('/borradores'), contador: borradores, contadorTitulo: U.plural(borradores, 'borrador', 'borradores') },
        { href: '#/soluciones', texto: 'Soluciones', icono: 'libro', activo: empieza('/soluciones') },
        { href: '#/tickets/nuevo', texto: 'Nuevo ticket', icono: 'mas', activo: (r) => r === '/tickets/nuevo', soloMovil: true },
      ];
    }
    const pendientes = S.soluciones({ estado: 'PENDIENTE' }).length;
    return [
      { href: '#/', texto: 'Inicio', icono: 'inicio', activo: (r) => r === '/' },
      { href: '#/tickets', texto: 'Tickets', icono: 'lista', activo: empieza('/tickets') },
      { href: '#/soluciones', texto: 'Soluciones', icono: 'libro', activo: empieza('/soluciones'), contador: pendientes, contadorTitulo: U.plural(pendientes, 'solución pendiente de aprobación', 'soluciones pendientes de aprobación') },
      { href: '#/estadisticas', texto: 'Estadísticas', icono: 'grafico', activo: empieza('/estadisticas') },
      { href: '#/admin/usuarios', texto: 'Administración', icono: 'ajustes', activo: empieza('/admin') },
      { href: '#/auditoria', texto: 'Auditoría', icono: 'escudo', activo: empieza('/auditoria') },
    ];
  }

  function enlaceNav(item, ruta, movil) {
    const activo = item.activo(ruta);
    return h('a', { href: item.href, 'aria-current': activo ? 'page' : null },
      movil ? App.ui.icono(item.icono) : null,
      item.texto,
      item.contador ? h('span', { class: 'contador', title: item.contadorTitulo }, h('span', { 'aria-hidden': 'true' }, item.contador), h('span', { class: 'sr-only' }, ' (' + item.contadorTitulo + ')')) : null);
  }

  function marca() {
    return h('a', { class: 'marca', href: '#/', 'aria-label': 'ORMEN · Sistema de tickets, ir al inicio' },
      h('span', { class: 'marca-circulo', 'aria-hidden': 'true' }),
      h('span', { class: 'marca-nombre', 'aria-hidden': 'true' }, 'ORMEN'),
      h('span', { class: 'marca-sep', 'aria-hidden': 'true' }),
      h('span', { class: 'marca-sistema', 'aria-hidden': 'true' }, 'Sistema de tickets'));
  }

  function cerrarMenus(excepto) {
    U.$$('[data-menu-boton]').forEach((b) => {
      if (b === excepto) return;
      b.setAttribute('aria-expanded', 'false');
      const m = document.getElementById(b.getAttribute('aria-controls'));
      if (m) m.hidden = true;
    });
  }

  function botonMenu(boton, menu) {
    boton.setAttribute('data-menu-boton', '');
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-controls', menu.id);
    menu.hidden = true;
    boton.addEventListener('click', (e) => {
      e.stopPropagation();
      const abrir = menu.hidden;
      cerrarMenus(boton);
      menu.hidden = !abrir;
      boton.setAttribute('aria-expanded', String(abrir));
      if (abrir) {
        const primero = U.$('a, button', menu);
        if (primero && boton.classList.contains('boton-usuario')) primero.focus();
      }
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a, button')) cerrarMenus(); });
  }

  async function restablecerDatos(u) {
    const ok = await App.ui.confirmar({
      titulo: 'Restablecer los datos de la demo',
      mensaje: 'Se borran los tickets, comentarios, soluciones y usuarios que hayas cargado en este navegador y se vuelven a generar los datos de ejemplo. Las demás pestañas también se actualizan.',
      textoConfirmar: 'Restablecer',
      peligro: true,
    });
    if (!ok) return;
    App.router.descartarCambios();
    App.store.restablecer(u && u.id);
    App.ui.toast('Listo: la demo volvió a los datos de ejemplo.');
    App.router.ir('/', { reemplazar: true });
  }

  function menuUsuario(u) {
    const S = App.store;
    const detalle = u.rol === 'CLIENTE' ? S.nombre('localidades', u.localidadId) : u.cargo || App.ui.nombreRol(u);
    const boton = h('button', { type: 'button', class: 'boton-usuario', 'aria-haspopup': 'true', 'aria-label': 'Menú de ' + u.nombre },
      App.ui.avatar(u),
      h('span', { class: 'datos' }, h('span', { class: 'nombre' }, u.nombre), h('span', { class: 'rol' }, App.ui.nombreRol(u) + ' · ' + detalle)),
      App.ui.icono('abajo', 'i-sm'));
    const menu = h('div', { class: 'menu', id: 'menu-usuario' },
      h('div', { class: 'menu-cabecera' },
        h('div', { class: 'fuerte' }, u.nombre),
        h('div', { class: 'chico suave' }, App.ui.nombreRol(u) + ' · ' + detalle),
        h('div', { class: 'muy-chico suave' }, u.email)),
      h('a', { href: '#/notas' }, App.ui.icono('info'), 'Notas de la demo'),
      h('a', { href: '#/correos' }, App.ui.icono('correo'), 'Correos simulados'),
      h('div', { class: 'sep', role: 'separator' }),
      h('button', { type: 'button', onClick: () => { App.auth.salir(); App.router.ir('/ingresar', { reemplazar: true }); } }, App.ui.icono('usuarios'), 'Cambiar de usuario'),
      h('button', { type: 'button', onClick: () => restablecerDatos(u) }, App.ui.icono('refrescar'), 'Restablecer datos de la demo'),
      h('div', { class: 'sep', role: 'separator' }),
      h('button', { type: 'button', onClick: () => { App.auth.salir(); App.ui.toast('Cerraste la sesión.'); App.router.ir('/ingresar', { reemplazar: true }); } }, App.ui.icono('salir'), 'Cerrar sesión'));
    botonMenu(boton, menu);
    return h('div', { class: 'desplegable' }, boton, menu);
  }

  function barra(u, ruta) {
    const interior = h('div', { class: 'contenedor barra-interior' }, marca(), h('span', { class: 'pill-demo' }, 'Demo'));
    if (!u) {
      interior.append(h('div', { class: 'barra-acciones' }, h('a', { class: 'btn btn-primario btn-sm', href: '#/ingresar' }, 'Ingresar')));
      return h('header', { class: 'barra' }, interior);
    }
    const items = navegacion(u);
    interior.append(h('nav', { class: 'nav', 'aria-label': 'Principal' }, items.filter((i) => !i.soloMovil).map((i) => enlaceNav(i, ruta))));
    const acciones = h('div', { class: 'barra-acciones' });
    if (u.rol === 'OPERADOR' && ruta !== '/tickets/nuevo') {
      acciones.append(h('a', { class: 'btn btn-primario btn-sm solo-escritorio', href: '#/tickets/nuevo' }, App.ui.icono('mas', 'i-sm'), 'Nuevo ticket'));
    }
    acciones.append(menuUsuario(u));
    const movil = h('nav', { class: 'menu-movil', id: 'menu-movil', 'aria-label': 'Principal' }, items.map((i) => enlaceNav(i, ruta, true)));
    const botonMovil = h('button', { type: 'button', class: 'btn btn-fantasma btn-icono boton-menu', 'aria-label': 'Abrir el menú' }, App.ui.icono('menu'));
    botonMenu(botonMovil, movil);
    acciones.append(botonMovil);
    interior.append(acciones);
    return h('header', { class: 'barra' }, interior, movil);
  }

  function franja() {
    return h('div', { class: 'franja-demo' }, h('div', { class: 'contenedor' },
      App.ui.icono('info', 'i-sm'),
      h('span', null, h('strong', null, 'Demo con datos ficticios.'), h('span', { class: 'texto-largo' }, ' Los cambios se guardan sólo en este navegador.')),
      h('a', { href: '#/notas' }, 'Qué está confirmado y qué falta definir')));
  }

  function pie() {
    return h('footer', { class: 'pie' }, h('div', { class: 'contenedor' },
      h('span', null, 'Sistema de tickets ORMEN · Demo navegable · Proyecto Integrador, Universidad ORT Uruguay, 2026'),
      h('span', null, 'Datos ficticios · ', h('a', { href: '#/notas' }, 'Notas de la demo'))));
  }

  function montar(nodo, info) {
    const app = document.getElementById('app');
    U.vaciar(app);
    if (info.def && info.def.sinMarco) {
      app.append(nodo);
      return;
    }
    const main = h('main', { id: 'contenido', class: 'main', tabindex: '-1' }, h('div', { class: 'contenedor' }, nodo));
    const saltar = h('button', { type: 'button', class: 'skip-link', onClick: () => { const t = document.getElementById('titulo-pagina') || main; t.focus(); } }, 'Saltar al contenido');
    app.append(saltar, barra(info.usuario, info.ctx.ruta), franja(), main, pie());
  }

  // Cerrar menús al hacer clic afuera o con Escape.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.desplegable, .menu-movil')) cerrarMenus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const abierto = U.$$('[data-menu-boton][aria-expanded="true"]')[0];
    if (abierto) { cerrarMenus(); abierto.focus(); }
  });

  App.layout = { montar, restablecerDatos };
})(window.App = window.App || {});
