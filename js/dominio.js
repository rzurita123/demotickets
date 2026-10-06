/* ==========================================================================
   Reglas y textos del dominio compartidos por la semilla, el almacén y las
   pantallas: estados del ticket, roles, operaciones de auditoría y el
   formato del correo simulado.
   ========================================================================== */
(function (App) {
  'use strict';

  /**
   * Estados acordados con ORMEN (respuestas de octubre). Las descripciones
   * son las del documento de preguntas; "Elevado" lo pidió ORMEN.
   */
  const ESTADOS = {
    BORRADOR: {
      nombre: 'Borrador',
      descripcion: 'Guardado a medio completar. Sólo lo ve quien lo creó y no cuenta en estadísticas.',
      icono: 'borrador',
    },
    ABIERTO: { nombre: 'Abierto', descripcion: 'Ticket registrado, pendiente de atención.', icono: 'circulo' },
    PENDIENTE: { nombre: 'Pendiente', descripcion: 'En espera de algo externo, por ejemplo una respuesta del cliente.', icono: 'reloj' },
    ELEVADO: { nombre: 'Elevado', descripcion: 'Pasado a otro nivel de soporte.', icono: 'elevar' },
    CERRADO: { nombre: 'Cerrado', descripcion: 'Resuelto, con la solución aplicada registrada.', icono: 'check' },
  };

  /** Estados en los que el ticket está en curso (no borrador ni cerrado). */
  const ESTADOS_ACTIVOS = ['ABIERTO', 'PENDIENTE', 'ELEVADO'];
  /** Estados que cuentan para estadísticas (todo menos borrador). */
  const ESTADOS_REGISTRADOS = ['ABIERTO', 'PENDIENTE', 'ELEVADO', 'CERRADO'];

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
    DATOS: 'Modificación de datos del ticket',
    CIERRE: 'Cierre de ticket',
    REAPERTURA: 'Reapertura de ticket',
    SOLUCION_PROPUESTA: 'Solución propuesta al catálogo',
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
