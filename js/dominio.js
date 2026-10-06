/* ==========================================================================
   Reglas y textos del dominio compartidos por la semilla, el almacén y las
   pantallas: estados del ticket, roles, operaciones de auditoría y el
   formato del correo simulado.
   ========================================================================== */
(function (App) {
  'use strict';

  /**
   * Estados del ticket. "Elevado" no es un estado: es un atributo que dice a
   * qué grupo o persona se derivó el ticket (`elevadoA`); el recorrido
   * completo sale de la actividad.
   */
  const ESTADOS = {
    BORRADOR: {
      nombre: 'Borrador',
      descripcion: 'Guardado a medio completar. Sólo lo ve quien lo creó y no cuenta en estadísticas.',
      icono: 'borrador',
    },
    ABIERTO: { nombre: 'Abierto', descripcion: 'Registrado y todavía no atendido: nadie de Mesa de ayuda lo tomó.', icono: 'circulo' },
    EN_PROCESO: { nombre: 'En proceso', descripcion: 'Un operador de Mesa de ayuda lo está atendiendo.', icono: 'reloj' },
    BLOQUEADO: { nombre: 'Bloqueado', descripcion: 'Detenido por un factor externo, por ejemplo un proveedor o una respuesta de la agencia.', icono: 'pausa' },
    CERRADO: { nombre: 'Cerrado', descripcion: 'Resuelto, con la solución aplicada registrada.', icono: 'check' },
  };

  /** Estados en los que el ticket está en curso (no borrador ni cerrado). */
  const ESTADOS_ACTIVOS = ['ABIERTO', 'EN_PROCESO', 'BLOQUEADO'];
  /** Estados que cuentan para estadísticas (todo menos borrador). */
  const ESTADOS_REGISTRADOS = ['ABIERTO', 'EN_PROCESO', 'BLOQUEADO', 'CERRADO'];

  const ROLES = {
    OPERADOR: { nombre: 'Operador', descripcion: 'Mesa de ayuda de ORMEN: ve y resuelve tickets.' },
    ADMINISTRADOR: { nombre: 'Administrador', descripcion: 'Gestión de ORMEN: usuarios, localidades y base de soluciones.' },
    CLIENTE: { nombre: 'Cliente', descripcion: 'Banca o agencia: crea tickets y ve los de su localidad.' },
  };

  /** Operaciones que quedan en el registro de auditoría. */
  const OPERACIONES = {
    LOGIN: 'Inicio de sesión',
    LOGOUT: 'Cierre de sesión',
    TICKET_CREADO: 'Creación de ticket',
    TICKET_CERRADO_DIRECTO: 'Registro de ticket resuelto',
    BORRADOR_GUARDADO: 'Borrador guardado',
    BORRADOR_DESCARTADO: 'Borrador descartado',
    ESTADO: 'Cambio de estado',
    COMENTARIO_PUBLICO: 'Comentario público',
    COMENTARIO_PRIVADO: 'Comentario privado',
    ASIGNACION: 'Asignación',
    LIBERACION: 'Ticket devuelto a la cola',
    ELEVACION: 'Elevación de ticket',
    BLOQUEO: 'Ticket bloqueado',
    DESBLOQUEO: 'Ticket desbloqueado',
    DATOS: 'Modificación de datos del ticket',
    CIERRE: 'Cierre de ticket',
    REAPERTURA: 'Reapertura de ticket',
    SOLUCION_PROPUESTA: 'Borrador de solución propuesto',
    SOLUCION_CREADA: 'Solución cargada en el catálogo',
    SOLUCION_EDITADA: 'Solución modificada',
    SOLUCION_APROBADA: 'Solución aprobada',
    SOLUCION_RECHAZADA: 'Solución rechazada',
    USUARIO_ALTA: 'Alta de usuario',
    USUARIO_MODIF: 'Modificación de usuario',
    LOCALIDAD_ALTA: 'Alta de localidad',
    LOCALIDAD_MODIF: 'Modificación de localidad',
    CATALOGO: 'Modificación de catálogos',
    PARAMETROS: 'Modificación de parámetros',
    ACCESO_DENEGADO: 'Acceso denegado',
    DATOS_RESTABLECIDOS: 'Datos de la demo restablecidos',
  };

  /**
   * Correo simulado al creador del ticket cuando un operador lo actualiza
   * (ORMEN: "deseable, no obligatorio"). Sólo lleva información pública.
   */
  function componerCorreo({ ticket, destinatario, actor, motivo, detalle }) {
    const numero = ticket.numero ? '#' + ticket.numero : '';
    const estado = ESTADOS[ticket.estado] ? ESTADOS[ticket.estado].nombre : ticket.estado;
    const asuntos = {
      comentario: `Ticket ${numero}: nueva respuesta de Mesa de ayuda`,
      estado: `Ticket ${numero}: el estado cambió a ${estado}`,
      'en-proceso': `Ticket ${numero}: Mesa de ayuda lo está atendiendo`,
      elevado: `Ticket ${numero}: se derivó a otro nivel de soporte`,
      bloqueado: `Ticket ${numero}: en espera de un factor externo`,
      cierre: `Ticket ${numero} cerrado`,
      reapertura: `Ticket ${numero} reabierto`,
    };
    const lineas = [
      `Hola ${destinatario.nombre.split(' ')[0]}:`,
      '',
      `Tu ticket ${numero} "${ticket.titulo}" tuvo una actualización.`,
      `Estado actual: ${estado}.`,
    ];
    if (detalle) lineas.push('', detalle);
    lineas.push('', 'Podés ver el detalle ingresando al Sistema de tickets.', '', `Mesa de ayuda ORMEN (${actor.nombre})`);
    return { asunto: asuntos[motivo] || `Ticket ${numero} actualizado`, cuerpo: lineas.join('\n') };
  }

  App.dominio = { ESTADOS, ESTADOS_ACTIVOS, ESTADOS_REGISTRADOS, ROLES, OPERACIONES, componerCorreo };
})(window.App = window.App || {});
