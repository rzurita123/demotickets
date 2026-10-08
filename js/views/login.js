/* ==========================================================================
   Ingreso con usuarios de prueba (contraseña "demo").
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  function detalleUsuario(u) {
    const S = App.store;
    return u.rol === 'CLIENTE' ? S.nombre('localidades', u.localidadId) : u.cargo || '';
  }

  App.vistas.login = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const volver = ctx.query.volver && ctx.query.volver.charAt(0) === '/' && ctx.query.volver.indexOf('/ingresar') !== 0 ? ctx.query.volver : '/';

    function entrar(resultado) {
      if (!resultado.ok) return false;
      ui.toast('Ingresaste como ' + resultado.usuario.nombre + '.');
      App.router.ir(volver, { reemplazar: true });
      return true;
    }

    // Panel de marca
    const panel = h('section', { class: 'login-panel', 'aria-label': 'ORMEN' },
      h('div', { class: 'marca' },
        h('img', { class: 'marca-logo', src: 'assets/logo-ormen.png', alt: 'ORMEN' })),
      h('h1', { id: 'titulo-pagina', tabindex: '-1' }, 'Mesa de ayuda', h('span', null, 'Sistema de tickets')),
      h('img', { class: 'login-esfera', src: 'assets/esfera-ormen.svg', alt: '', 'aria-hidden': 'true' }));

    // Todos los usuarios de prueba
    const rapidos = h('div', { class: 'usuarios-demo' }, App.catalogos.accesosRapidos.map((id) => {
      const u = S.usuario(id);
      if (!u || u.activo === false) return null;
      return h('button', { type: 'button', class: 'usuario-demo', dataset: { rol: u.rol }, onClick: () => entrar(App.auth.ingresarComo(u.id)) },
        ui.avatar(u, 'lg'),
        h('span', { class: 'datos' },
          h('span', { class: 'rol' }, ui.nombreRol(u)),
          h('span', { class: 'nombre' }, u.nombre),
          h('span', { class: 'detalle' }, detalleUsuario(u))),
        ui.icono('flechaDer', 'flecha'));
    }));

    // Formulario
    const errorGeneral = h('div', { role: 'alert' });
    const inUsuario = h('input', { id: 'login-usuario', class: 'control', type: 'text', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
    const inClave = h('input', { id: 'login-clave', class: 'control', type: 'password', autocomplete: 'current-password' });
    const form = h('form', { class: 'login-form', novalidate: true },
      errorGeneral,
      ui.campo({ nombre: 'usuario', id: 'login-usuario', etiqueta: 'Usuario', control: inUsuario }),
      ui.campo({ nombre: 'contrasena', id: 'login-clave', etiqueta: 'Contraseña', control: inClave }),
      h('button', { type: 'submit', class: 'btn btn-oscuro btn-lg' }, 'Ingresar'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      U.vaciar(errorGeneral);
      const r = App.auth.ingresar(inUsuario.value, inClave.value);
      if (r.errores) { ui.mostrarErrores(form, r.errores); return; }
      ui.limpiarErrores(form);
      if (!r.ok) { errorGeneral.append(ui.aviso(r.mensaje, 'rojo')); inClave.select(); return; }
      entrar(r);
    });

    const contenido = h('section', { class: 'login-contenido', 'aria-labelledby': 'login-titulo' },
      h('h2', { id: 'login-titulo' }, 'Ingresar como'),
      rapidos,
      h('div', { class: 'login-sep' }, h('span', null, 'o con usuario y contraseña')),
      form,
      h('p', { class: 'login-clave' }, 'Contraseña de prueba: ', h('strong', null, 'demo')));

    return h('div', { class: 'login' }, panel, contenido);
  };
})(window.App = window.App || {});
