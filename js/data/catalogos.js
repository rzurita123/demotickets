/* ==========================================================================
   Datos maestros de la demo.

   Origen de cada lista (para saber qué es real y qué es de ejemplo):
   - Localidades: las que aparecen en el sistema actual "Atención a Clientes
     v1.0z" (pantalla de estadísticas) y en las respuestas de ORMEN (Artigas,
     Paysandú, Pando, Lagomar).
   - Sistemas: los de la pantalla de estadísticas del sistema actual.
   - Subsistemas: sólo "Otros" aparece en el sistema actual; el resto son
     EJEMPLOS para la demo (marcados con ejemplo: true). Reemplazar por los
     reales de ORMEN.
   - Tipos de problema: los del sistema actual (No definido, Operación,
     Software, Equipamiento, Configuración).
   - Tipos de solicitud: los del documento "Contexto a desarrollar".
   - Criticidad: valores de ejemplo (Alta, Media, Baja); ORMEN no los definió.
   - Usuarios: personas FICTICIAS. Las del equipo de operadores y la gerencia
     retoman las personas de las historias de usuario.

   Se pueden editar libremente: después de cambiar este archivo, usar
   "Restablecer datos de la demo" para regenerar la base local.
   ========================================================================== */
(function (App) {
  'use strict';

  const localidades = [
    { id: 'loc-artigas', nombre: 'Artigas' },
    { id: 'loc-canelones', nombre: 'Canelones' },
    { id: 'loc-carmelo', nombre: 'Carmelo' },
    { id: 'loc-durazno', nombre: 'Durazno' },
    { id: 'loc-florida', nombre: 'Florida' },
    { id: 'loc-lagomar', nombre: 'Lagomar' },
    { id: 'loc-pando', nombre: 'Pando' },
    { id: 'loc-paysandu', nombre: 'Paysandú' },
    { id: 'loc-rosario', nombre: 'Rosario' },
    { id: 'loc-santa-lucia', nombre: 'Santa Lucía' },
    { id: 'loc-trinidad', nombre: 'Trinidad' },
  ];

  const sistemas = [
    { id: 'sis-liquidacion', nombre: 'Liquidación' },
    { id: 'sis-caja', nombre: 'Caja' },
    { id: 'sis-control-terminales', nombre: 'Control Terminales' },
    { id: 'sis-online', nombre: 'On-Line' },
    { id: 'sis-envio-archivos', nombre: 'Envío Archivos' },
    { id: 'sis-correos', nombre: 'Correos Ormen' },
    { id: 'sis-correos-colectiviz', nombre: 'Correos Colectiviz.' },
    { id: 'sis-todos-terminales', nombre: 'Todos Terminales' },
    { id: 'sis-adm-usuarios', nombre: 'Adm. Usuarios' },
    { id: 'sis-instalaciones', nombre: 'Instalaciones' },
  ];

  // [id, sistemaId, nombre, ejemplo]
  const subsistemas = [
    ['sub-liq-diaria', 'sis-liquidacion', 'Liquidación diaria', true],
    ['sub-liq-premios', 'sis-liquidacion', 'Premios', true],
    ['sub-liq-reportes', 'sis-liquidacion', 'Reportes', true],
    ['sub-liq-otros', 'sis-liquidacion', 'Otros', false],
    ['sub-caja-apertura', 'sis-caja', 'Apertura', true],
    ['sub-caja-cierre', 'sis-caja', 'Cierre', true],
    ['sub-caja-movimientos', 'sis-caja', 'Movimientos', true],
    ['sub-caja-otros', 'sis-caja', 'Otros', false],
    ['sub-term-bloqueo', 'sis-control-terminales', 'Bloqueo', true],
    ['sub-term-sincro', 'sis-control-terminales', 'Sincronización', true],
    ['sub-term-alta', 'sis-control-terminales', 'Alta de terminal', true],
    ['sub-term-impresion', 'sis-control-terminales', 'Impresión', true],
    ['sub-term-otros', 'sis-control-terminales', 'Otros', false],
    ['sub-online-conexion', 'sis-online', 'Conexión', true],
    ['sub-online-jugadas', 'sis-online', 'Registro de jugadas', true],
    ['sub-online-otros', 'sis-online', 'Otros', false],
    ['sub-env-envio', 'sis-envio-archivos', 'Envío', true],
    ['sub-env-recepcion', 'sis-envio-archivos', 'Recepción', true],
    ['sub-env-otros', 'sis-envio-archivos', 'Otros', false],
    ['sub-correo-recepcion', 'sis-correos', 'Recepción', true],
    ['sub-correo-cuenta', 'sis-correos', 'Configuración de cuenta', true],
    ['sub-correo-otros', 'sis-correos', 'Otros', false],
    ['sub-colect-otros', 'sis-correos-colectiviz', 'Otros', false],
    ['sub-todos-otros', 'sis-todos-terminales', 'Otros', false],
    ['sub-usu-alta', 'sis-adm-usuarios', 'Alta de usuario', true],
    ['sub-usu-contrasena', 'sis-adm-usuarios', 'Contraseña', true],
    ['sub-usu-permisos', 'sis-adm-usuarios', 'Permisos', true],
    ['sub-usu-otros', 'sis-adm-usuarios', 'Otros', false],
    ['sub-inst-equipo', 'sis-instalaciones', 'Equipo nuevo', true],
    ['sub-inst-reinstalacion', 'sis-instalaciones', 'Reinstalación', true],
    ['sub-inst-otros', 'sis-instalaciones', 'Otros', false],
  ].map(([id, sistemaId, nombre, ejemplo]) => ({ id, sistemaId, nombre, ejemplo }));

  const tiposProblema = [
    { id: 'tp-nodef', nombre: 'No definido' },
    { id: 'tp-operacion', nombre: 'Operación' },
    { id: 'tp-software', nombre: 'Software' },
    { id: 'tp-equipamiento', nombre: 'Equipamiento' },
    { id: 'tp-configuracion', nombre: 'Configuración' },
  ];

  const criticidades = [
    { id: 'cri-alta', nombre: 'Alta', orden: 1, clase: 'cri-alta' },
    { id: 'cri-media', nombre: 'Media', orden: 2, clase: 'cri-media' },
    { id: 'cri-baja', nombre: 'Baja', orden: 3, clase: 'cri-baja' },
  ];

  const tiposSolicitud = [
    { id: 'ts-atencion', nombre: 'Solicitud de atención' },
    { id: 'ts-sugerencia', nombre: 'Sugerencia de funcionalidad' },
  ];

  // Todos los usuarios de la demo usan la contraseña "demo".
  // Los correos usan el dominio reservado .example para que no sean reales.
  const usuarios = [
    // Mesa de ayuda de ORMEN
    { id: 'u-vpereira', usuario: 'vpereira', nombre: 'Valeria Pereira', rol: 'OPERADOR', email: 'vpereira@ormen.example', cargo: 'Mesa de ayuda' },
    { id: 'u-nacosta', usuario: 'nacosta', nombre: 'Nicolás Acosta', rol: 'OPERADOR', email: 'nacosta@ormen.example', cargo: 'Mesa de ayuda' },
    { id: 'u-crivero', usuario: 'crivero', nombre: 'Camila Rivero', rol: 'OPERADOR', email: 'crivero@ormen.example', cargo: 'Mesa de ayuda' },
    { id: 'u-fnunez', usuario: 'fnunez', nombre: 'Federico Núñez', rol: 'OPERADOR', email: 'fnunez@ormen.example', cargo: 'Mesa de ayuda' },
    { id: 'u-mlopez', usuario: 'mlopez', nombre: 'Martina López', rol: 'OPERADOR', email: 'mlopez@ormen.example', cargo: 'Mesa de ayuda', activo: false },
    // Gestión de ORMEN
    { id: 'u-scabrera', usuario: 'scabrera', nombre: 'Silvia Cabrera', rol: 'ADMINISTRADOR', email: 'scabrera@ormen.example', cargo: 'Gerencia de operaciones' },
    { id: 'u-ralvarez', usuario: 'ralvarez', nombre: 'Rodrigo Álvarez', rol: 'ADMINISTRADOR', email: 'ralvarez@ormen.example', cargo: 'Responsable de sistemas' },
    // Clientes (usuarios de bancas y agencias)
    { id: 'u-mtechera', usuario: 'mtechera', nombre: 'Marcelo Techera', rol: 'CLIENTE', email: 'mtechera@pando.example', localidadId: 'loc-pando', cargo: 'Encargado' },
    { id: 'u-lsosa', usuario: 'lsosa', nombre: 'Lucía Sosa', rol: 'CLIENTE', email: 'lsosa@pando.example', localidadId: 'loc-pando', cargo: 'Cajera' },
    { id: 'u-lgomez', usuario: 'lgomez', nombre: 'Laura Gómez', rol: 'CLIENTE', email: 'lgomez@lagomar.example', localidadId: 'loc-lagomar', cargo: 'Encargada' },
    { id: 'u-jsilva', usuario: 'jsilva', nombre: 'Jorge Silva', rol: 'CLIENTE', email: 'jsilva@artigas.example', localidadId: 'loc-artigas', cargo: 'Encargado' },
    { id: 'u-arodriguez', usuario: 'arodriguez', nombre: 'Ana Rodríguez', rol: 'CLIENTE', email: 'arodriguez@rosario.example', localidadId: 'loc-rosario', cargo: 'Encargada' },
    { id: 'u-sferreira', usuario: 'sferreira', nombre: 'Sebastián Ferreira', rol: 'CLIENTE', email: 'sferreira@canelones.example', localidadId: 'loc-canelones', cargo: 'Encargado' },
    { id: 'u-polivera', usuario: 'polivera', nombre: 'Patricia Olivera', rol: 'CLIENTE', email: 'polivera@santalucia.example', localidadId: 'loc-santa-lucia', cargo: 'Encargada' },
    { id: 'u-gmendez', usuario: 'gmendez', nombre: 'Gustavo Méndez', rol: 'CLIENTE', email: 'gmendez@carmelo.example', localidadId: 'loc-carmelo', cargo: 'Encargado' },
    { id: 'u-csuarez', usuario: 'csuarez', nombre: 'Claudia Suárez', rol: 'CLIENTE', email: 'csuarez@durazno.example', localidadId: 'loc-durazno', cargo: 'Encargada' },
    { id: 'u-acastro', usuario: 'acastro', nombre: 'Andrés Castro', rol: 'CLIENTE', email: 'acastro@trinidad.example', localidadId: 'loc-trinidad', cargo: 'Encargado' },
    { id: 'u-mbenitez', usuario: 'mbenitez', nombre: 'Mónica Benítez', rol: 'CLIENTE', email: 'mbenitez@florida.example', localidadId: 'loc-florida', cargo: 'Encargada' },
    { id: 'u-jromero', usuario: 'jromero', nombre: 'Javier Romero', rol: 'CLIENTE', email: 'jromero@paysandu.example', localidadId: 'loc-paysandu', cargo: 'Encargado' },
  ];

  /**
   * Pesos de la sugerencia de soluciones. ORMEN explicó los criterios
   * (mismo sistema/subsistema + palabras clave) pero NO cuántos puntos vale
   * cada uno: son valores provisorios, editables en Administración.
   */
  const parametros = {
    pesoSistema: 3,
    pesoSubsistema: 2,
    pesoPalabraClave: 2,
    pesoLocalidad: 1,
    pesoPalabraComun: 1,
    maxResultados: 6,
  };

  /** Usuarios destacados en la pantalla de ingreso (uno por rol). */
  const accesosRapidos = ['u-vpereira', 'u-scabrera', 'u-mtechera', 'u-lgomez'];

  App.catalogos = { localidades, sistemas, subsistemas, tiposProblema, criticidades, tiposSolicitud, usuarios, parametros, accesosRapidos };
})(window.App = window.App || {});
