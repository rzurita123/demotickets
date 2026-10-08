/* ==========================================================================
   Arranque: rutas de la demo y sincronización entre pestañas.

   Para agregar una pantalla: crear js/views/mi-pantalla.js con
   App.vistas.miPantalla = function (ctx) { return nodo; }, sumarla en
   index.html y registrarla acá con los roles que la pueden ver.
   ========================================================================== */
(function (App) {
  'use strict';

  const R = App.router;
  const V = App.vistas;
  const ORMEN = ['OPERADOR', 'ADMINISTRADOR'];

  // Las rutas fijas van antes que las que tienen parámetros (/tickets/nuevo antes que /tickets/:numero).
  R.registrar('/ingresar', { vista: V.login, titulo: 'Ingresar', publica: true, sinMarco: true, soloSinSesion: true });
  R.registrar('/', { vista: V.inicio, titulo: 'Inicio' });

  R.registrar('/tickets', { vista: V.tickets, titulo: 'Tickets' });
  R.registrar('/tickets/nuevo', { vista: V.ticketNuevo, titulo: 'Crear ticket', roles: ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'] });
  R.registrar('/tickets/:numero', { vista: V.ticketDetalle, titulo: 'Ticket' });

  R.registrar('/borradores', { vista: V.borradores, titulo: 'Borradores', roles: ['OPERADOR'] });
  R.registrar('/borradores/:id', { vista: V.borrador, titulo: 'Borrador', roles: ['OPERADOR'] });

  R.registrar('/soluciones', { vista: V.soluciones, titulo: 'Soluciones reutilizables', roles: ORMEN });
  R.registrar('/soluciones/buscar', { vista: V.buscarSoluciones, titulo: 'Buscar una solución', roles: ORMEN });
  R.registrar('/soluciones/nueva', { vista: V.solucionForm, titulo: 'Nueva solución reutilizable', roles: ORMEN });
  R.registrar('/soluciones/:id', { vista: V.solucion, titulo: 'Solución reutilizable', roles: ORMEN });
  R.registrar('/soluciones/:id/editar', { vista: V.solucionForm, titulo: 'Editar solución', roles: ['ADMINISTRADOR'] });

  R.registrar('/estadisticas', { vista: V.estadisticas, titulo: 'Estadísticas', roles: ['ADMINISTRADOR'] });

  R.registrar('/admin', { vista: V.adminUsuarios, titulo: 'Usuarios', roles: ['ADMINISTRADOR'] });
  R.registrar('/admin/usuarios', { vista: V.adminUsuarios, titulo: 'Usuarios', roles: ['ADMINISTRADOR'] });
  R.registrar('/admin/localidades', { vista: V.adminLocalidades, titulo: 'Localidades', roles: ['ADMINISTRADOR'] });
  R.registrar('/admin/catalogos', { vista: V.adminCatalogos, titulo: 'Catálogos', roles: ['ADMINISTRADOR'] });
  R.registrar('/auditoria', { vista: V.auditoria, titulo: 'Auditoría', roles: ['ADMINISTRADOR'] });

  R.registrar('/correos', { vista: V.correos, titulo: 'Correos simulados' });

  function hayModalAbierto() {
    return document.body.classList.contains('con-modal');
  }

  function arrancar() {
    const inicio = App.store.iniciar();

    // Otra pestaña cambió los datos: se redibuja, salvo que haya algo a medio cargar.
    let avisoPendiente = null;
    App.store.alCambiar((info) => {
      if (info.aviso) App.ui.toast(info.aviso, { tipo: 'aviso', duracion: 10000 });
      if (!info.externo) return;
      if (R.estaSucio() || hayModalAbierto()) {
        if (avisoPendiente) avisoPendiente();
        avisoPendiente = App.ui.toast('Hubo cambios en otra pestaña.', {
          tipo: 'aviso',
          accion: { texto: 'Actualizar', fn: () => { avisoPendiente = null; App.router.refrescar(); } },
          duracion: 12000,
        });
        return;
      }
      R.refrescar();
    });

    R.iniciar();

    if (!inicio.almacenamiento) {
      App.ui.toast('Este navegador no deja guardar datos: la demo funciona, pero los cambios se pierden al recargar.', { tipo: 'aviso', duracion: 10000 });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})(window.App = window.App || {});
