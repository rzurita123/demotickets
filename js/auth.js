/* ==========================================================================
   Sesión y permisos de la demo.

   El ingreso es simulado: todos los usuarios de prueba usan la contraseña
   "demo". La sesión vive en sessionStorage, así que cada pestaña puede
   tener un usuario distinto (por ejemplo, un operador y un cliente).
   ORMEN pidió usuarios propios por ahora; la integración con sus usuarios
   y el SSO quedan para más adelante.
   ========================================================================== */
(function (App) {
  'use strict';

  const CLAVE = 'ormen-tickets-demo:sesion';
  const CONTRASENA_DEMO = 'demo';
  let memoria = null; // por si el navegador bloquea sessionStorage

  function guardarSesion(s) {
    memoria = s;
    try {
      if (s) sessionStorage.setItem(CLAVE, JSON.stringify(s));
      else sessionStorage.removeItem(CLAVE);
    } catch { /* queda en memoria */ }
  }

  function leerSesion() {
    try {
      const t = sessionStorage.getItem(CLAVE);
      if (t) return JSON.parse(t);
    } catch { /* usar memoria */ }
    return memoria;
  }

  function usuarioActual() {
    const s = leerSesion();
    if (!s) return null;
    const u = App.store.usuario(s.usuarioId);
    if (!u || u.activo === false) return null;
    return u;
  }

  function iniciarSesion(u, via) {
    guardarSesion({ usuarioId: u.id, inicio: new Date().toISOString() });
    App.store.registrarAuditoria(u.id, 'LOGIN', null, via);
  }

  function ingresar(nombreUsuario, contrasena) {
    const login = String(nombreUsuario || '').trim().toLowerCase();
    const errores = {};
    if (!login) errores.usuario = 'Escribí tu usuario.';
    if (!contrasena) errores.contrasena = 'Escribí la contraseña.';
    if (Object.keys(errores).length) return { ok: false, errores };
    const u = App.store.datos.usuarios.find((x) => x.usuario === login);
    if (!u || contrasena !== CONTRASENA_DEMO) return { ok: false, mensaje: 'Usuario o contraseña incorrectos. En la demo la contraseña es "demo".' };
    if (u.activo === false) return { ok: false, mensaje: 'Ese usuario está desactivado. Un administrador lo puede volver a activar.' };
    iniciarSesion(u, 'Usuario y contraseña');
    return { ok: true, usuario: u };
  }

  function ingresarComo(id) {
    const u = App.store.usuario(id);
    if (!u || u.activo === false) return { ok: false, mensaje: 'Ese usuario no está disponible.' };
    iniciarSesion(u, 'Acceso rápido de la demo');
    return { ok: true, usuario: u };
  }

  function salir() {
    const u = usuarioActual();
    if (u) App.store.registrarAuditoria(u.id, 'LOGOUT', null, '');
    guardarSesion(null);
  }

  /** Permisos por rol. */
  const PERMISOS = {
    'tickets.crear': ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'],
    'tickets.tratar': ['OPERADOR'],
    'tickets.comentar': ['OPERADOR', 'CLIENTE'],
    'tickets.registrarResuelto': ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'],
    borradores: ['OPERADOR'],
    'soluciones.ver': ['OPERADOR', 'ADMINISTRADOR'],
    'soluciones.proponer': ['OPERADOR'],
    'soluciones.gestionar': ['ADMINISTRADOR'],
    estadisticas: ['ADMINISTRADOR'],
    administracion: ['ADMINISTRADOR'],
    auditoria: ['ADMINISTRADOR'],
  };

  function puede(permiso, u) {
    const usuario = u || usuarioActual();
    return !!usuario && (PERMISOS[permiso] || []).includes(usuario.rol);
  }

  App.auth = { CONTRASENA_DEMO, usuarioActual, ingresar, ingresarComo, salir, puede, PERMISOS };
})(window.App = window.App || {});
