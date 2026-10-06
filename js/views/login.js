/* ==========================================================================
   Ingreso con usuarios de prueba (contraseña "demo").
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  function detalleUsuario(u) {
    const S = App.store;
    if (u.rol === 'CLIENTE') return 'Cliente · ' + S.nombre('localidades', u.localidadId);
    return App.ui.nombreRol(u) + ' · ' + (u.cargo || '');
  }

  const QUE_PROBAR = {
    'u-vpereira': 'Atiende tickets, comenta, cierra con solución y usa las sugerencias.',
    'u-scabrera': 'Aprueba soluciones, ve estadísticas, usuarios y auditoría.',
    'u-mtechera': 'Crea tickets y ve todos los de Pando.',
    'u-lgomez': 'Otra localidad: no ve los tickets de Pando.',
  };

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

    // Panel institucional
    const panel = h('section', { class: 'login-panel', 'aria-label': 'Sobre la demo' },
      h('div', { class: 'marca' },
        h('span', { class: 'marca-circulo', 'aria-hidden': 'true' }),
        h('span', { class: 'marca-nombre' }, 'ORMEN'),
        h('span', { class: 'marca-sep', 'aria-hidden': 'true' }),
        h('span', { class: 'marca-sistema' }, 'Sistema de tickets')),
      h('div', { class: 'pila' },
        h('span', { class: 'antetitulo', style: 'color: #F1DDB0' }, 'Demo navegable'),
        h('h1', { id: 'titulo-pagina', tabindex: '-1' }, 'Sistema de tickets de Mesa de ayuda'),
        h('p', null, 'Prototipo para recorrer con ORMEN cómo se crean, siguen y resuelven los tickets de bancas y agencias. Todos los datos son ficticios.')),
      h('ul', null,
        [
          'Cada localidad ve sólo sus tickets; ORMEN ve todos.',
          'Comentarios públicos para la localidad y privados para ORMEN.',
          'Sugerencias de solución a partir de la descripción del problema.',
          'Catálogo de soluciones con aprobación del administrador.',
          'Estadísticas por sistema, fecha, operador y tipo.',
        ].map((t) => h('li', null, ui.icono('checkCirculo'), h('span', null, t)))),
      h('p', { class: 'nota' }, 'Proyecto Integrador · Analista en Tecnologías de la Información · Universidad ORT Uruguay · 2026'));

    // Accesos rápidos
    const rapidos = h('div', { class: 'usuarios-demo' }, App.catalogos.accesosRapidos.map((id) => {
      const u = S.usuario(id);
      if (!u || u.activo === false) return null;
      return h('button', { type: 'button', class: 'usuario-demo', onClick: () => entrar(App.auth.ingresarComo(u.id)) },
        ui.avatar(u, 'lg'),
        h('span', { class: 'datos' },
          h('span', { class: 'nombre' }, u.nombre),
          h('span', { class: 'rol' }, detalleUsuario(u)),
          QUE_PROBAR[u.id] && h('span', { class: 'muy-chico suave', style: 'margin-top: 4px' }, QUE_PROBAR[u.id])),
        ui.icono('flechaDer', 'flecha'));
    }));

    // Formulario
    const errorGeneral = h('div', { role: 'alert' });
    const inUsuario = h('input', { id: 'login-usuario', class: 'control', type: 'text', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
    const inClave = h('input', { id: 'login-clave', class: 'control', type: 'password', autocomplete: 'current-password' });
    const form = h('form', { class: 'pila', novalidate: true },
      errorGeneral,
      h('div', { class: 'login-form' },
        ui.campo({ nombre: 'usuario', id: 'login-usuario', etiqueta: 'Usuario', control: inUsuario }),
        ui.campo({ nombre: 'contrasena', id: 'login-clave', etiqueta: 'Contraseña', control: inClave }),
        h('button', { type: 'submit', class: 'btn btn-primario', style: 'min-height: 42px' }, 'Ingresar')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      U.vaciar(errorGeneral);
      const r = App.auth.ingresar(inUsuario.value, inClave.value);
      if (r.errores) { ui.mostrarErrores(form, r.errores); return; }
      ui.limpiarErrores(form);
      if (!r.ok) { errorGeneral.append(ui.aviso(r.mensaje, 'rojo')); inClave.select(); return; }
      entrar(r);
    });

    // Todos los usuarios de prueba
    const filas = S.usuarios().map((u) => h('tr', null,
      ui.celda('Nombre', h('span', { class: 'fila-sm', style: 'flex-wrap: nowrap' }, ui.avatar(u, 'sm'), h('span', { class: 'fuerte' }, u.nombre))),
      ui.celda('Usuario', h('code', null, u.usuario)),
      ui.celda('Rol', ui.nombreRol(u)),
      ui.celda('Localidad o cargo', u.rol === 'CLIENTE' ? S.nombre('localidades', u.localidadId) : u.cargo),
      ui.celda('', u.activo === false
        ? h('span', { class: 'badge inactivo' }, 'Inactivo')
        : h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => entrar(App.auth.ingresarComo(u.id)) }, 'Entrar'), 'derecha')));
    const todos = h('details', { class: 'card sin-padding' },
      h('summary', { style: 'padding: 14px 18px; cursor: pointer; font-weight: 600; color: var(--azul-texto)' }, 'Ver todos los usuarios de prueba (' + S.usuarios().length + ')'),
      h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
        h('thead', null, h('tr', null, ['Nombre', 'Usuario', 'Rol', 'Localidad o cargo', ''].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, filas))));

    const contenido = h('section', { class: 'login-contenido', 'aria-labelledby': 'login-titulo' },
      h('div', { class: 'pila-sm' },
        h('h2', { id: 'login-titulo', style: 'font-size: 26px' }, 'Ingresar'),
        h('p', { class: 'suave' }, 'Elegí un usuario de prueba o ingresá con usuario y contraseña. La contraseña de todos es ', h('strong', null, 'demo'), '.')),
      rapidos,
      form,
      todos,
      ui.aviso([h('strong', null, 'Para mostrarlo de a dos: '), 'abrí otra pestaña con otro usuario (por ejemplo, un operador y un cliente de Pando). Las dos pestañas comparten los datos y se actualizan solas.']),
      h('p', { class: 'chico' }, h('a', { href: '#/notas' }, 'Notas de la demo: qué está confirmado por ORMEN y qué falta definir')));

    return h('div', { class: 'login' }, panel, contenido);
  };
})(window.App = window.App || {});
