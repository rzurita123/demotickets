/* ==========================================================================
   Generador de datos FICTICIOS de la demo.

   Arma una base completa (tickets de los últimos 9 meses, catálogo de
   soluciones, auditoría y correos simulados) a partir de plantillas. Usa un
   generador con semilla fija, así que "Restablecer datos" siempre produce la
   misma historia; las fechas se calculan relativas al momento en que se
   genera, para que la demo siempre se vea al día.

   Para cambiar los datos: editar las plantillas, el catálogo o los pesos de
   este archivo (o js/data/catalogos.js) y restablecer la demo.
   ========================================================================== */
(function (App) {
  'use strict';

  const VERSION = 4;

  // ------------------------------------------------- Imágenes de ejemplo ---

  function svgDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim());
  }

  const IMG_ERROR = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#E9EDF1"/>
      <rect x="120" y="76" width="400" height="224" rx="8" fill="#FFFFFF" stroke="#9AA8B5"/>
      <path d="M128 76h384a8 8 0 0 1 8 8v30H120V84a8 8 0 0 1 8-8z" fill="#285D83"/>
      <text x="140" y="101" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#FFFFFF">Mensaje del sistema</text>
      <circle cx="178" cy="176" r="24" fill="#FBE9E9" stroke="#9C2B2B" stroke-width="3"/>
      <text x="178" y="186" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="#9C2B2B">!</text>
      <text x="218" y="170" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#1C3A5A">No se pudo completar</text>
      <text x="218" y="194" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#1C3A5A">la operación.</text>
      <rect x="404" y="246" width="96" height="34" rx="4" fill="#E4EEF6" stroke="#1D78B4"/>
      <text x="452" y="268" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#1C3A5A">Aceptar</text>
      <text x="20" y="384" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#5F6E7C">Imagen de ejemplo (demo)</text>
    </svg>`);

  const IMG_PASOS = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="260" viewBox="0 0 720 260">
      <rect width="720" height="260" fill="#F7F9FB"/>
      <g font-family="Arial, Helvetica, sans-serif">
        <rect x="24" y="56" width="196" height="124" rx="12" fill="#FFFFFF" stroke="#C9D3DD"/>
        <circle cx="56" cy="90" r="17" fill="#1D78B4"/>
        <text x="56" y="96" text-anchor="middle" font-size="17" font-weight="bold" fill="#FFFFFF">1</text>
        <text x="40" y="138" font-size="17" fill="#1C3A5A">Apagar la</text>
        <text x="40" y="160" font-size="17" fill="#1C3A5A">terminal</text>
        <rect x="262" y="56" width="196" height="124" rx="12" fill="#FFFFFF" stroke="#C9D3DD"/>
        <circle cx="294" cy="90" r="17" fill="#1D78B4"/>
        <text x="294" y="96" text-anchor="middle" font-size="17" font-weight="bold" fill="#FFFFFF">2</text>
        <text x="278" y="138" font-size="17" fill="#1C3A5A">Retirar y volver</text>
        <text x="278" y="160" font-size="17" fill="#1C3A5A">a colocar el rollo</text>
        <rect x="500" y="56" width="196" height="124" rx="12" fill="#FFFFFF" stroke="#C9D3DD"/>
        <circle cx="532" cy="90" r="17" fill="#1D78B4"/>
        <text x="532" y="96" text-anchor="middle" font-size="17" font-weight="bold" fill="#FFFFFF">3</text>
        <text x="516" y="138" font-size="17" fill="#1C3A5A">Encender y hacer</text>
        <text x="516" y="160" font-size="17" fill="#1C3A5A">una prueba</text>
        <path d="M226 118h28M246 110l8 8-8 8M464 118h28M484 110l8 8-8 8" stroke="#D6B169" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="24" y="236" font-size="13" fill="#5F6E7C">Imagen de ejemplo (demo)</text>
      </g>
    </svg>`);

  // ------------------------------------------------ Catálogo de soluciones ---
  // desdeTicket: la solución nació del cierre de un ticket (propuesta por el
  // operador y aprobada por un administrador). El resto son independientes.

  const CATALOGO = [
    {
      id: 'sol-liq-reprocesar', titulo: 'Reprocesar la liquidación diaria que no aparece',
      sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-diaria',
      palabrasClave: ['liquidación', 'no aparece', 'no figura', 'liquidación del día'],
      descripcion: '1. Confirmar con la agencia la fecha de la liquidación que falta.\n2. Verificar en el sistema central si el proceso de liquidación terminó.\n3. Si no terminó o terminó con error, reprocesar la liquidación de esa fecha.\n4. Pedir a la agencia que vuelva a ingresar y confirme que la ve.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-liq-anulacion', titulo: 'Diferencia en la liquidación por anulación fuera de horario',
      sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-diaria',
      palabrasClave: ['diferencia', 'no coincide', 'anulación', 'liquidación'],
      descripcion: 'Cuando una anulación se registra después del cierre, impacta en la liquidación del día siguiente.\n1. Pedir a la agencia la fecha y el importe de la diferencia.\n2. Buscar anulaciones registradas después del cierre de ese día.\n3. Mostrar al cliente en qué liquidación figura.',
      creadaPorId: 'u-scabrera', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-liq-premio', titulo: 'Premio pagado después del cierre',
      sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-premios',
      palabrasClave: ['premio', 'pagado', 'no figura', 'descontado'],
      descripcion: 'Los premios pagados después del cierre figuran en la liquidación del día siguiente.\n1. Pedir fecha y hora del pago.\n2. Confirmar si fue posterior al cierre.\n3. Indicar al cliente en qué liquidación lo va a ver.',
      creadaPorId: 'u-nacosta', revisadaPorId: 'u-scabrera', desdeTicket: 'p-liq-premio',
    },
    {
      id: 'sol-navegador', titulo: 'Borrar la caché del navegador',
      sistemaId: null, subsistemaId: null,
      palabrasClave: ['exportar', 'descargar', 'no carga', 'navegador', 'botón no responde', 'pantalla en blanco'],
      descripcion: 'Solución general: sirve cuando una pantalla no carga, un botón no responde o una descarga falla.\n1. Cerrar todas las ventanas del navegador.\n2. Borrar la caché y las cookies del último día.\n3. Volver a ingresar y repetir la operación.\n4. Si persiste, probar con otro navegador.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-caja-anterior', titulo: 'Caja del día anterior sin cerrar',
      sistemaId: 'sis-caja', subsistemaId: 'sub-caja-apertura',
      palabrasClave: ['abrir caja', 'apertura', 'caja anterior', 'sin cerrar'],
      descripcion: '1. Ingresar con el usuario encargado de la agencia.\n2. Verificar si quedó abierta la caja del día anterior.\n3. Hacer el cierre pendiente.\n4. Abrir la caja del día.',
      creadaPorId: 'u-scabrera', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-caja-duplicado', titulo: 'Movimiento duplicado en el cierre de caja',
      sistemaId: 'sis-caja', subsistemaId: 'sub-caja-cierre',
      palabrasClave: ['diferencia', 'cierre de caja', 'faltante', 'sobrante', 'duplicado'],
      descripcion: '1. Pedir a la agencia el importe de la diferencia.\n2. Revisar los movimientos del día buscando registros repetidos por ese importe.\n3. Anular el movimiento duplicado.\n4. Volver a hacer el cierre.',
      creadaPorId: 'u-vpereira', revisadaPorId: 'u-scabrera', desdeTicket: 'p-caja-diferencia',
    },
    {
      id: 'sol-caja-anular', titulo: 'Anular y volver a ingresar un movimiento',
      sistemaId: 'sis-caja', subsistemaId: 'sub-caja-movimientos',
      palabrasClave: ['importe', 'movimiento', 'anular', 'corregir', 'equivocado'],
      descripcion: '1. Buscar el movimiento en el detalle del día.\n2. Anularlo indicando el motivo.\n3. Ingresarlo de nuevo con el importe correcto.',
      creadaPorId: 'u-scabrera', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-term-desbloqueo', titulo: 'Desbloquear una terminal por intentos fallidos',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-bloqueo',
      palabrasClave: ['bloqueada', 'bloqueo', 'no permite vender', 'intentos'],
      descripcion: '1. Buscar la terminal en Control Terminales.\n2. Confirmar que el bloqueo es por intentos fallidos.\n3. Desbloquearla.\n4. Pedir a la agencia que ingrese con el usuario correcto.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-term-reinicio', titulo: 'Reiniciar la terminal y verificar la conexión',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-sincro',
      palabrasClave: ['sincroniza', 'sincronización', 'desactualizada', 'reiniciar'],
      descripcion: '1. Apagar la terminal y esperar 30 segundos.\n2. Encenderla y verificar que tenga conexión.\n3. Forzar la sincronización.\n4. Si no sincroniza, revisar la conexión de la agencia.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-term-alta', titulo: 'Alta de una terminal nueva',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-alta',
      palabrasClave: ['alta', 'terminal nueva', 'número de serie', 'habilitar'],
      descripcion: '1. Pedir el número de serie de la terminal.\n2. Registrarla en Control Terminales asociada a la agencia.\n3. Confirmar con la agencia la primera conexión.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-term-impresora', titulo: 'La impresora de la terminal no imprime',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-impresion',
      palabrasClave: ['impresora', 'no imprime', 'imprime en blanco', 'papel', 'rollo', 'comprobante'],
      descripcion: '1. Apagar la terminal.\n2. Retirar el rollo y volver a colocarlo con el lado térmico hacia el cabezal.\n3. Encender la terminal y hacer una impresión de prueba.\n4. Si imprime en blanco, el rollo está colocado al revés.',
      creadaPorId: 'u-crivero', revisadaPorId: 'u-scabrera', desdeTicket: 'p-term-impresion', imagen: true,
    },
    {
      id: 'sol-online-router', titulo: 'Sin conexión: reiniciar el router de la agencia',
      sistemaId: 'sis-online', subsistemaId: 'sub-online-conexion',
      palabrasClave: ['sin conexión', 'conexión', 'internet', 'router', 'no conecta'],
      descripcion: '1. Confirmar si el problema ocurre en todas las terminales.\n2. Pedir a la agencia que apague el router, espere un minuto y lo vuelva a encender.\n3. Verificar la conexión con On-Line.\n4. Si sigue sin conexión, la agencia debe contactar a su proveedor de internet.',
      creadaPorId: 'u-fnunez', revisadaPorId: 'u-ralvarez', desdeTicket: 'p-online-conexion',
    },
    {
      id: 'sol-env-tamano', titulo: 'El archivo de cierre supera el tamaño permitido',
      sistemaId: 'sis-envio-archivos', subsistemaId: 'sub-env-envio',
      palabrasClave: ['archivo', 'envío', 'error de envío', 'tamaño'],
      descripcion: '1. Revisar si el archivo incluye días anteriores.\n2. Generarlo de nuevo sólo con el día actual.\n3. Enviarlo y confirmar la recepción.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-correo-spam', titulo: 'Los correos llegan a la carpeta de no deseado',
      sistemaId: 'sis-correos', subsistemaId: 'sub-correo-recepcion',
      palabrasClave: ['correo', 'no llegan', 'no deseado', 'spam', 'recibir'],
      descripcion: '1. Pedir a la agencia que revise la carpeta de correo no deseado.\n2. Marcar el remitente como seguro.\n3. Confirmar que el próximo correo llegue a la bandeja de entrada.',
      creadaPorId: 'u-vpereira', revisadaPorId: 'u-scabrera', desdeTicket: 'p-correo-no-llegan',
    },
    {
      id: 'sol-correo-config', titulo: 'Configurar la cuenta de correo en un equipo',
      sistemaId: 'sis-correos', subsistemaId: 'sub-correo-cuenta',
      palabrasClave: ['configurar', 'cuenta', 'correo', 'equipo nuevo'],
      descripcion: '1. Abrir el programa de correo del equipo.\n2. Agregar la cuenta con los datos de servidor de ORMEN.\n3. Enviar un correo de prueba y verificar la recepción.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-usu-desbloqueo', titulo: 'Desbloquear usuario y generar contraseña temporal',
      sistemaId: 'sis-adm-usuarios', subsistemaId: 'sub-usu-contrasena',
      palabrasClave: ['usuario bloqueado', 'contraseña', 'intentos', 'no puede ingresar'],
      descripcion: '1. Verificar la identidad del encargado de la agencia.\n2. Desbloquear el usuario.\n3. Generar una contraseña temporal.\n4. Indicar que la cambie en el primer ingreso.',
      creadaPorId: 'u-fnunez', revisadaPorId: 'u-ralvarez', desdeTicket: 'p-usu-bloqueado',
    },
    {
      id: 'sol-usu-alta', titulo: 'Alta de usuario de agencia',
      sistemaId: 'sis-adm-usuarios', subsistemaId: 'sub-usu-alta',
      palabrasClave: ['alta', 'usuario nuevo', 'empleado', 'empleada'],
      descripcion: '1. Pedir nombre y documento de la persona al encargado.\n2. Crear el usuario con el perfil que corresponda.\n3. Enviar los datos de acceso al encargado.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-inst-remota', titulo: 'Instalación del sistema por acceso remoto',
      sistemaId: 'sis-instalaciones', subsistemaId: 'sub-inst-equipo',
      palabrasClave: ['instalar', 'instalación', 'equipo nuevo', 'computadora', 'acceso remoto', 'formatear'],
      descripcion: '1. Coordinar el acceso remoto con la agencia.\n2. Instalar el sistema.\n3. Restaurar la configuración de la agencia.\n4. Verificar el ingreso con un usuario de la agencia.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
  ];

  // ---------------------------------------------- Plantillas de problemas ---

  const PLANTILLAS = [
    // Liquidación
    {
      id: 'p-liq-no-aparece', sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-diaria', tipoProblemaId: 'tp-software', peso: 5,
      titulo: 'La liquidación del día no aparece',
      descripciones: ['No figura la liquidación del día en el sistema; ayer a esta hora ya estaba disponible.', 'La agencia no ve la liquidación de hoy al entrar al sistema.'],
      solucion: 'Se reprocesó la liquidación del día desde el sistema central y quedó disponible. Se pidió a la agencia volver a ingresar para verla.',
      catalogoId: 'sol-liq-reprocesar',
    },
    {
      id: 'p-liq-diferencia', sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-diaria', tipoProblemaId: 'tp-operacion', peso: 5,
      titulo: 'Diferencia en la liquidación',
      descripciones: ['El total de la liquidación no coincide con lo que la agencia tiene registrado.', 'Hay una diferencia entre la liquidación y el resumen de ventas del día.'],
      solucion: 'Se revisaron los movimientos con el cliente: había una anulación hecha fuera de horario que impacta en la liquidación del día siguiente. Se explicó cómo verla en el detalle.',
      catalogoId: 'sol-liq-anulacion',
    },
    {
      id: 'p-liq-premio', sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-premios', tipoProblemaId: 'tp-operacion', peso: 4,
      titulo: 'Premio pagado que no figura en la liquidación',
      descripciones: ['Se pagó un premio y no aparece descontado en la liquidación.', 'Un premio que pagaron ayer no figura en la liquidación.'],
      solucion: 'El premio se pagó después del cierre, por lo que figura en la liquidación del día siguiente. Se mostró al cliente dónde consultarlo.',
      catalogoId: 'sol-liq-premio',
    },
    {
      id: 'p-liq-reporte', sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-reportes', tipoProblemaId: 'tp-software', peso: 3,
      titulo: 'Error al exportar el reporte de liquidación',
      descripciones: ['Al exportar el reporte de liquidación aparece un error y no se descarga el archivo.', 'El botón de exportar el reporte no responde.'],
      solucion: 'Se borró la caché del navegador y se volvió a exportar; el archivo se descargó bien.',
      catalogoId: 'sol-navegador',
    },
    {
      id: 'p-liq-sugerencia', sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-reportes', tipoProblemaId: 'tp-nodef', peso: 1, sugerencia: true,
      titulo: 'Filtrar el reporte de liquidación por rango de fechas',
      descripciones: ['Sería útil poder elegir un rango de fechas en el reporte de liquidación en lugar de consultar día por día.'],
      solucion: 'Se registró la sugerencia para que ORMEN la evalúe.',
    },
    // Caja
    {
      id: 'p-caja-apertura', sistemaId: 'sis-caja', subsistemaId: 'sub-caja-apertura', tipoProblemaId: 'tp-operacion', peso: 5,
      titulo: 'No permite abrir la caja',
      descripciones: ['Al iniciar el día aparece un mensaje de error al intentar abrir la caja y no deja continuar.', 'No pueden abrir la caja; el sistema avisa que hay una caja anterior abierta.'],
      solucion: 'La caja del día anterior había quedado sin cerrar. Se hizo el cierre pendiente con el usuario encargado y después se pudo abrir la caja.',
      catalogoId: 'sol-caja-anterior',
    },
    {
      id: 'p-caja-diferencia', sistemaId: 'sis-caja', subsistemaId: 'sub-caja-cierre', tipoProblemaId: 'tp-operacion', peso: 5,
      titulo: 'Diferencia en el cierre de caja',
      descripciones: ['Al cerrar la caja aparece una diferencia entre el total del sistema y el efectivo contado.', 'Hay un faltante en el cierre de caja que no pueden explicar.'],
      solucion: 'Se revisaron los movimientos del día con el encargado: había un pago registrado dos veces. Se anuló el duplicado y el cierre quedó correcto.',
      catalogoId: 'sol-caja-duplicado',
    },
    {
      id: 'p-caja-movimiento', sistemaId: 'sis-caja', subsistemaId: 'sub-caja-movimientos', tipoProblemaId: 'tp-operacion', peso: 4,
      titulo: 'Movimiento ingresado con importe incorrecto',
      descripciones: ['Se ingresó un movimiento con un importe equivocado y no saben cómo corregirlo.', 'Cargaron mal el importe de un movimiento de caja.'],
      solucion: 'Se anuló el movimiento y se volvió a ingresar con el importe correcto. Se explicó al usuario cómo hacer la anulación.',
      catalogoId: 'sol-caja-anular',
    },
    {
      id: 'p-caja-procesando', sistemaId: 'sis-caja', subsistemaId: 'sub-caja-cierre', tipoProblemaId: 'tp-software', peso: 3,
      titulo: 'El cierre de caja queda procesando',
      descripciones: ['Al confirmar el cierre de caja la pantalla queda procesando y no termina.', 'El cierre de caja no termina nunca, queda cargando.'],
      solucion: 'Se verificó que el cierre se había registrado en el sistema central. Se recargó la pantalla y el cierre figuraba como realizado.',
    },
    {
      id: 'p-caja-sugerencia', sistemaId: 'sis-caja', subsistemaId: 'sub-caja-cierre', tipoProblemaId: 'tp-nodef', peso: 1, sugerencia: true,
      titulo: 'Poder reimprimir el comprobante de cierre',
      descripciones: ['Pedimos poder reimprimir el comprobante de cierre de caja de días anteriores.'],
      solucion: 'Se registró la sugerencia para que ORMEN la evalúe.',
    },
    // Control Terminales
    {
      id: 'p-term-bloqueada', sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-bloqueo', tipoProblemaId: 'tp-operacion', peso: 5,
      titulo: 'Terminal bloqueada',
      descripciones: ['La terminal muestra el mensaje de terminal bloqueada y no permite vender.', 'Se bloqueó una terminal después de varios intentos de ingreso.'],
      solucion: 'Se verificó en Control Terminales que estaba bloqueada por intentos fallidos. Se desbloqueó y se pidió reingresar con el usuario correcto.',
      catalogoId: 'sol-term-desbloqueo',
    },
    {
      id: 'p-term-sincro', sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-sincro', tipoProblemaId: 'tp-software', peso: 4,
      titulo: 'La terminal no sincroniza',
      descripciones: ['La terminal no se sincroniza con el sistema central desde la mañana.', 'Una de las terminales quedó desactualizada y no sincroniza.'],
      solucion: 'Se reinició la terminal y se verificó la conexión. Después del reinicio sincronizó correctamente.',
      catalogoId: 'sol-term-reinicio',
    },
    {
      id: 'p-term-alta', sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-alta', tipoProblemaId: 'tp-configuracion', peso: 2,
      titulo: 'Alta de terminal nueva',
      descripciones: ['Solicitan dar de alta una terminal nueva para la agencia.', 'Llegó una terminal nueva y necesitan habilitarla.'],
      solucion: 'Se registró la terminal en Control Terminales con el número de serie informado y se confirmó la primera conexión con el cliente.',
      catalogoId: 'sol-term-alta',
    },
    {
      id: 'p-term-impresion', sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-impresion', tipoProblemaId: 'tp-equipamiento', peso: 4,
      titulo: 'La impresora de la terminal no imprime',
      descripciones: ['La impresora de la terminal no saca el comprobante. El papel está bien puesto.', 'La terminal imprime los comprobantes en blanco.'],
      solucion: 'Se apagó la terminal, se retiró y volvió a colocar el rollo y se encendió de nuevo. Imprimió normalmente.',
      catalogoId: 'sol-term-impresora',
    },
    // On-Line
    {
      id: 'p-online-conexion', sistemaId: 'sis-online', subsistemaId: 'sub-online-conexion', tipoProblemaId: 'tp-equipamiento', peso: 5,
      titulo: 'Sin conexión con el sistema On-Line',
      descripciones: ['Las terminales de la agencia no logran conectarse al sistema On-Line.', 'Se cortó la conexión con On-Line en toda la agencia.'],
      solucion: 'Hubo una caída del servicio de internet de la agencia. El cliente reinició el router y se restableció la conexión.',
      catalogoId: 'sol-online-router',
    },
    {
      id: 'p-online-lento', sistemaId: 'sis-online', subsistemaId: 'sub-online-jugadas', tipoProblemaId: 'tp-software', peso: 3,
      titulo: 'Demora al registrar jugadas',
      descripciones: ['El sistema demora varios segundos en confirmar cada jugada.', 'Está muy lento el registro de jugadas desde el mediodía.'],
      solucion: 'Se revisó la conexión de la agencia: otro equipo estaba descargando archivos pesados. Al detener la descarga, la velocidad se normalizó.',
    },
    // Envío Archivos
    {
      id: 'p-env-error', sistemaId: 'sis-envio-archivos', subsistemaId: 'sub-env-envio', tipoProblemaId: 'tp-software', peso: 4,
      titulo: 'No se envía el archivo de cierre',
      descripciones: ['Al intentar enviar el archivo de cierre del día aparece un error de envío.', 'El envío del archivo de cierre queda en error.'],
      solucion: 'El archivo incluía días anteriores y superaba el tamaño permitido. Se generó de nuevo sólo con el día actual y se envió sin problemas.',
      catalogoId: 'sol-env-tamano',
    },
    {
      id: 'p-env-incompleto', sistemaId: 'sis-envio-archivos', subsistemaId: 'sub-env-recepcion', tipoProblemaId: 'tp-software', peso: 2,
      titulo: 'Archivo recibido incompleto',
      descripciones: ['El archivo que llegó está incompleto, faltan registros.'],
      solucion: 'Se pidió el reenvío del archivo y se verificó que llegara completo.',
    },
    // Correos Ormen
    {
      id: 'p-correo-no-llegan', sistemaId: 'sis-correos', subsistemaId: 'sub-correo-recepcion', tipoProblemaId: 'tp-configuracion', peso: 4,
      titulo: 'No llegan los correos',
      descripciones: ['La agencia no está recibiendo los correos de ORMEN desde ayer.', 'No les llegan los correos con los resúmenes.'],
      solucion: 'Los correos estaban llegando a la carpeta de correo no deseado. Se marcó el remitente como seguro.',
      catalogoId: 'sol-correo-spam',
    },
    {
      id: 'p-correo-config', sistemaId: 'sis-correos', subsistemaId: 'sub-correo-cuenta', tipoProblemaId: 'tp-configuracion', peso: 2,
      titulo: 'Configurar la cuenta de correo en un equipo nuevo',
      descripciones: ['Cambiaron el equipo y necesitan configurar la cuenta de correo.'],
      solucion: 'Se configuró la cuenta en el programa de correo y se verificó el envío y la recepción.',
      catalogoId: 'sol-correo-config',
    },
    // Adm. Usuarios
    {
      id: 'p-usu-bloqueado', sistemaId: 'sis-adm-usuarios', subsistemaId: 'sub-usu-contrasena', tipoProblemaId: 'tp-operacion', peso: 5,
      titulo: 'Usuario bloqueado',
      descripciones: ['Un usuario de la agencia quedó bloqueado por intentos fallidos.', 'No pueden ingresar con el usuario del turno de la tarde: dice usuario bloqueado.'],
      solucion: 'Se desbloqueó el usuario y se generó una contraseña temporal. Se indicó cambiarla en el primer ingreso.',
      catalogoId: 'sol-usu-desbloqueo',
    },
    {
      id: 'p-usu-alta', sistemaId: 'sis-adm-usuarios', subsistemaId: 'sub-usu-alta', tipoProblemaId: 'tp-operacion', peso: 3,
      titulo: 'Alta de usuario para un empleado nuevo',
      descripciones: ['Necesitan un usuario para una empleada nueva.', 'Ingresó un empleado nuevo y necesita usuario.'],
      solucion: 'Se creó el usuario con el perfil solicitado y se enviaron los datos de acceso al encargado.',
      catalogoId: 'sol-usu-alta',
    },
    {
      id: 'p-usu-olvido', sistemaId: 'sis-adm-usuarios', subsistemaId: 'sub-usu-contrasena', tipoProblemaId: 'tp-operacion', peso: 2,
      titulo: 'Olvidó la contraseña',
      descripciones: ['El encargado no recuerda la contraseña y no puede ingresar.'],
      solucion: 'Se restableció la contraseña y se indicó cambiarla al ingresar.',
      catalogoId: 'sol-usu-desbloqueo',
    },
    // Instalaciones
    {
      id: 'p-inst-equipo', sistemaId: 'sis-instalaciones', subsistemaId: 'sub-inst-equipo', tipoProblemaId: 'tp-configuracion', peso: 3,
      titulo: 'Instalación del sistema en un equipo nuevo',
      descripciones: ['Compraron una computadora nueva y necesitan instalar el sistema.'],
      solucion: 'Se coordinó acceso remoto, se instaló el sistema y se verificó el ingreso con el usuario de la agencia.',
      catalogoId: 'sol-inst-remota',
    },
    {
      id: 'p-inst-reinstalar', sistemaId: 'sis-instalaciones', subsistemaId: 'sub-inst-reinstalacion', tipoProblemaId: 'tp-software', peso: 2,
      titulo: 'Reinstalar el sistema después de formatear',
      descripciones: ['Formatearon el equipo y hay que reinstalar el sistema.'],
      solucion: 'Se reinstaló el sistema por acceso remoto y se restauró la configuración de la agencia.',
      catalogoId: 'sol-inst-remota',
    },
    // Todos Terminales
    {
      id: 'p-todas-sin-servicio', sistemaId: 'sis-todos-terminales', subsistemaId: 'sub-todos-otros', tipoProblemaId: 'tp-equipamiento', peso: 1,
      titulo: 'Ninguna terminal funciona',
      descripciones: ['Ninguna de las terminales de la agencia enciende.'],
      solucion: 'Había un corte de energía en la zona. Al volver la energía, las terminales funcionaron normalmente.',
    },
  ];

  const PESO_SISTEMA = [
    ['sis-liquidacion', 22], ['sis-caja', 20], ['sis-control-terminales', 15], ['sis-online', 8], ['sis-envio-archivos', 6],
    ['sis-correos', 6], ['sis-adm-usuarios', 7], ['sis-instalaciones', 4], ['sis-todos-terminales', 2],
  ];
  const PESO_LOCALIDAD = [
    ['loc-pando', 24], ['loc-rosario', 10], ['loc-artigas', 6], ['loc-durazno', 6], ['loc-carmelo', 5], ['loc-canelones', 5],
    ['loc-florida', 4], ['loc-paysandu', 5], ['loc-lagomar', 5], ['loc-santa-lucia', 3], ['loc-trinidad', 3],
  ];
  const PESO_OPERADOR = [['u-vpereira', 30], ['u-nacosta', 26], ['u-crivero', 24], ['u-fnunez', 20]];

  const TXT = {
    publicoAtencion: [
      'Estamos revisando el caso, te avisamos por acá.',
      'Ya lo estamos viendo.',
      'Te llamamos para coordinar el acceso remoto.',
      'Recibimos el ticket y lo estamos revisando.',
    ],
    publicoPendiente: [
      '¿Nos podés confirmar si el problema sigue ocurriendo?',
      '¿Nos mandás una foto del mensaje que aparece en pantalla?',
      'Quedamos a la espera de que nos confirmes el número de terminal.',
      '¿Nos avisás cuando el encargado esté en la agencia para seguir con la revisión?',
    ],
    publicoCierre: [
      'Quedó resuelto. Cualquier cosa nos avisás.',
      'Listo, ya quedó funcionando.',
      'Resuelto. Si vuelve a pasar, comunicate con Mesa de ayuda.',
    ],
    privado: [
      'La agencia ya había reportado algo parecido hace unas semanas.',
      'Se habló con el encargado por teléfono.',
      'Revisar si coincide con otros casos del mismo sistema.',
      'El cliente estaba atendiendo público; se retoma más tarde.',
    ],
    privadoElevado: [
      'Se eleva porque requiere revisión fuera de mesa de ayuda.',
      'No se puede resolver desde mesa de ayuda; se eleva.',
    ],
    privadoSugerencia: ['Se eleva la sugerencia para su evaluación.'],
    clienteRespuesta: ['Sí, sigue pasando.', 'Ahí les mandé la foto.', 'Es la terminal 2.', 'Ya está el encargado en la agencia.'],
  };

  // ------------------------------------------------------------ Generador ---

  function generar() {
    const U = App.util;
    const C = App.catalogos;
    const D = App.dominio;
    const { MIN, HORA, DIA } = U;
    const rnd = U.prng(20261006);
    const ahora = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];
    const elegirPeso = (pares) => {
      let total = 0;
      for (const [, p] of pares) total += p;
      let r = rnd() * total;
      for (const [v, p] of pares) { r -= p; if (r <= 0) return v; }
      return pares[pares.length - 1][0];
    };
    let n = 0;
    const nuevoId = (p) => p + '-' + (++n).toString(36);

    const usuarios = C.usuarios.map((u) => Object.assign({ activo: true, localidadId: null, creadoEn: iso(ahora - 320 * DIA) }, u));
    const usuarioPorId = new Map(usuarios.map((u) => [u.id, u]));
    const usu = (id) => usuarioPorId.get(id);
    const clientesPorLocalidad = U.agruparPor(usuarios.filter((u) => u.rol === 'CLIENTE' && u.activo), (u) => u.localidadId);
    const plantillaPorId = new Map(PLANTILLAS.map((p) => [p.id, p]));
    const plantillasPorSistema = U.agruparPor(PLANTILLAS, (p) => p.sistemaId);

    // --- helpers de ticket ---
    function nuevoTicket({ plantilla, localidadId, creador, creadoMs, criticidadId, descripcion, titulo }) {
      const esOrmen = creador.rol !== 'CLIENTE';
      const creadoEn = iso(creadoMs);
      return {
        id: null, numero: null, estado: 'ABIERTO',
        titulo: titulo || plantilla.titulo,
        descripcion: descripcion || elegir(plantilla.descripciones),
        localidadId, sistemaId: plantilla.sistemaId, subsistemaId: plantilla.subsistemaId,
        tipoSolicitudId: plantilla.sugerencia ? 'ts-sugerencia' : 'ts-atencion',
        criticidadId, tipoProblemaId: esOrmen ? plantilla.tipoProblemaId : 'tp-nodef',
        creadoPorId: creador.id, operadorId: esOrmen ? creador.id : null,
        creadoEn, actualizadoEn: creadoEn, cerradoEn: null,
        adjuntos: [], solucion: null, registroDirecto: false,
        actividad: [{ id: nuevoId('a'), tipo: 'creado', fecha: creadoEn, autorId: creador.id }],
        _plantilla: plantilla.id,
      };
    }
    function evento(t, ms, datos) {
      const ev = Object.assign({ id: nuevoId('a'), fecha: iso(ms) }, datos);
      t.actividad.push(ev);
      t.actualizadoEn = ev.fecha;
      return ev;
    }
    const comentar = (t, ms, autorId, texto, visibilidad, adjuntos) => evento(t, ms, { tipo: 'comentario', autorId, texto, visibilidad, adjuntos: adjuntos || [] });
    function cambiarEstado(t, ms, autorId, a) {
      const de = t.estado;
      t.estado = a;
      return evento(t, ms, { tipo: 'estado', autorId, de, a });
    }
    function asignar(t, ms, autorId, operadorId) {
      const anteriorId = t.operadorId;
      t.operadorId = operadorId;
      return evento(t, ms, { tipo: 'asignado', autorId, operadorId, anteriorId });
    }
    function cerrar(t, ms, autorId, plantilla, usarCatalogo) {
      const de = t.estado;
      t.estado = 'CERRADO';
      t.cerradoEn = iso(ms);
      t.tipoProblemaId = plantilla.tipoProblemaId;
      t.solucion = {
        texto: plantilla.solucion, adjuntos: [],
        solucionCatalogoId: usarCatalogo && plantilla.catalogoId ? plantilla.catalogoId : null,
        autorId, fecha: iso(ms),
      };
      return evento(t, ms, { tipo: 'cierre', autorId, de });
    }
    function reabrir(t, ms, autorId) {
      const de = t.estado;
      t.estado = 'ABIERTO';
      t.cerradoEn = null;
      return evento(t, ms, { tipo: 'reapertura', autorId, de });
    }
    function reloj(inicioMs) {
      let t = inicioMs;
      return (minMin, maxMin) => {
        t = Math.min(t + (minMin + rnd() * (maxMin - minMin)) * MIN, ahora - 2 * MIN);
        return t;
      };
    }

    function desarrollar(t, { destino, operador, porCliente, plantilla, antiguedad }) {
      const paso = reloj(new Date(t.creadoEn).getTime());
      if (porCliente) {
        if (destino === 'ABIERTO' && rnd() < 0.55) return; // queda sin asignar en la cola
        asignar(t, paso(2, 45), operador.id, operador.id);
      }
      const op = operador.id;
      if (destino === 'ABIERTO') {
        if (rnd() < 0.35) comentar(t, paso(3, 50), op, elegir(TXT.privado), 'PRIVADO');
        if (rnd() < 0.3) comentar(t, paso(3, 50), op, elegir(TXT.publicoAtencion), 'PUBLICO');
        return;
      }
      if (destino === 'PENDIENTE') {
        if (rnd() < 0.4) comentar(t, paso(3, 60), op, elegir(TXT.privado), 'PRIVADO');
        const ms = paso(5, 90);
        cambiarEstado(t, ms, op, 'PENDIENTE');
        comentar(t, ms + 1000, op, elegir(TXT.publicoPendiente), 'PUBLICO');
        return;
      }
      if (destino === 'ELEVADO') {
        comentar(t, paso(5, 60), op, elegir(TXT.publicoAtencion), 'PUBLICO');
        const ms = paso(20, 240);
        cambiarEstado(t, ms, op, 'ELEVADO');
        comentar(t, ms + 1000, op, elegir(plantilla.sugerencia ? TXT.privadoSugerencia : TXT.privadoElevado), 'PRIVADO');
        return;
      }
      // Cerrado
      if (rnd() < 0.4) comentar(t, paso(4, 60), op, elegir(TXT.publicoAtencion), 'PUBLICO');
      if (rnd() < 0.3) comentar(t, paso(4, 90), op, elegir(TXT.privado), 'PRIVADO');
      if (porCliente && rnd() < 0.18) {
        const ms = paso(10, 120);
        cambiarEstado(t, ms, op, 'PENDIENTE');
        comentar(t, ms + 1000, op, elegir(TXT.publicoPendiente), 'PUBLICO');
        comentar(t, paso(20, 600), t.creadoPorId, elegir(TXT.clienteRespuesta), 'PUBLICO');
        cambiarEstado(t, paso(5, 60), op, 'ABIERTO');
      }
      const usarCatalogo = rnd() < 0.62;
      const msCierre = paso(10, rnd() < 0.7 ? 240 : 2880);
      if (rnd() < 0.45) comentar(t, msCierre - 1000, op, plantilla.sugerencia ? 'Gracias por la sugerencia. Quedó registrada para que ORMEN la evalúe.' : elegir(TXT.publicoCierre), 'PUBLICO');
      cerrar(t, msCierre, op, plantilla, usarCatalogo);
      if (antiguedad > 25 * DIA && rnd() < 0.06) {
        const ms = paso(1440, 4320);
        reabrir(t, ms, op);
        comentar(t, ms + 1000, op, 'La agencia avisa por teléfono que el problema volvió a aparecer.', 'PRIVADO');
        comentar(t, paso(30, 300), op, elegir(TXT.publicoAtencion), 'PUBLICO');
        cerrar(t, paso(30, 600), op, plantilla, usarCatalogo);
      }
    }

    // --- tickets aleatorios ---
    const tickets = [];
    const TOTAL = 152;
    for (let i = 0; i < TOTAL; i++) {
      const sistemaId = elegirPeso(PESO_SISTEMA);
      const plantilla = elegirPeso(plantillasPorSistema.get(sistemaId).map((p) => [p, p.peso || 1]));
      const localidadId = elegirPeso(PESO_LOCALIDAD);
      const edadDias = 272 * Math.pow(rnd(), 1.08);
      const d = new Date(ahora - edadDias * DIA);
      d.setHours(8 + Math.floor(rnd() * 13), Math.floor(rnd() * 60), Math.floor(rnd() * 60), 0);
      let creadoMs = d.getTime();
      if (creadoMs > ahora - 35 * MIN) creadoMs = ahora - (35 + rnd() * 300) * MIN;
      const antiguedad = ahora - creadoMs;
      const operadores = antiguedad > 150 * DIA ? PESO_OPERADOR.concat([['u-mlopez', 22]]) : PESO_OPERADOR;
      const operador = usu(elegirPeso(operadores));
      const clientes = clientesPorLocalidad.get(localidadId) || [];
      const porCliente = clientes.length > 0 && rnd() < 0.38;
      const creador = porCliente ? elegir(clientes) : operador;
      const criticidadId = plantilla.sugerencia ? 'cri-baja' : elegirPeso([['cri-alta', 2], ['cri-media', 5], ['cri-baja', 3]]);
      const t = nuevoTicket({ plantilla, localidadId, creador, creadoMs, criticidadId });
      const reciente = antiguedad < 12 * DIA;
      const destino = !reciente
        ? (rnd() < 0.965 ? 'CERRADO' : elegirPeso([['PENDIENTE', 1], ['ELEVADO', 2]]))
        : elegirPeso([['CERRADO', 5], ['ABIERTO', 2.4], ['PENDIENTE', 1.4], ['ELEVADO', 1]]);
      desarrollar(t, { destino, operador, porCliente, plantilla, antiguedad });
      tickets.push(t);
    }

    // --- tickets de escenario: casos fijos y recientes para recorrer la demo ---
    const p = (id) => plantillaPorId.get(id);
    const haceDias = (dias, h, m) => { const x = new Date(ahora - dias * DIA); x.setHours(h, m, 0, 0); return x.getTime(); };
    const recienteOAyer = (minutos) => ahora - minutos * MIN;

    // 1) Pando · Marcelo: impresora, sin asignar, con foto. Es el caso para mostrar las sugerencias.
    {
      const t = nuevoTicket({
        plantilla: p('p-term-impresion'), localidadId: 'loc-pando', creador: usu('u-mtechera'), creadoMs: recienteOAyer(25), criticidadId: 'cri-alta',
        descripcion: 'La impresora de la terminal 2 no saca el comprobante de la jugada. El papel está bien puesto y la terminal enciende normal. Adjunto foto del mensaje que aparece.',
      });
      t.adjuntos.push({ id: nuevoId('img'), nombre: 'mensaje-terminal.png', dataUrl: IMG_ERROR, autorId: 'u-mtechera', fecha: t.creadoEn });
      tickets.push(t);
    }
    // 2) Pando · Lucía (otra usuaria de la misma localidad): Pendiente, atiende Valeria.
    {
      const ms = haceDias(1, 19, 40);
      const t = nuevoTicket({
        plantilla: p('p-caja-diferencia'), localidadId: 'loc-pando', creador: usu('u-lsosa'), creadoMs: ms, criticidadId: 'cri-media',
        descripcion: 'Al cerrar la caja de anoche quedó una diferencia de $ 1.250 entre el total del sistema y el efectivo contado.',
      });
      asignar(t, ms + 12 * MIN, 'u-vpereira', 'u-vpereira');
      comentar(t, ms + 20 * MIN, 'u-vpereira', 'Estamos revisando los movimientos del día.', 'PUBLICO');
      comentar(t, ms + 25 * MIN, 'u-vpereira', 'Puede ser un pago de premio registrado dos veces, como en otros casos de Caja.', 'PRIVADO');
      cambiarEstado(t, ms + 31 * MIN, 'u-vpereira', 'PENDIENTE');
      comentar(t, ms + 31 * MIN + 1000, 'u-vpereira', '¿Nos podés confirmar a qué hora hicieron el último pago de premio? Con ese dato terminamos de revisar.', 'PUBLICO');
      tickets.push(t);
    }
    // 3) Pando · creado por ORMEN en nombre de la localidad: Elevado, con nota privada.
    {
      const ms = haceDias(2, 10, 15);
      const t = nuevoTicket({
        plantilla: p('p-online-conexion'), localidadId: 'loc-pando', creador: usu('u-nacosta'), creadoMs: ms, criticidadId: 'cri-alta',
        descripcion: 'La agencia llama porque las tres terminales perdieron la conexión con On-Line desde las 9:50.',
      });
      comentar(t, ms + 8 * MIN, 'u-nacosta', 'Estamos revisando la conexión de la agencia. Les avisamos por acá.', 'PUBLICO');
      comentar(t, ms + 30 * MIN, 'u-nacosta', 'Se reinició el router con el encargado y el problema sigue. Otras páginas cargan bien, así que no parece ser el proveedor de internet.', 'PRIVADO');
      cambiarEstado(t, ms + 42 * MIN, 'u-nacosta', 'ELEVADO');
      comentar(t, ms + 42 * MIN + 1000, 'u-nacosta', 'Se eleva porque requiere revisión fuera de mesa de ayuda.', 'PRIVADO');
      comentar(t, ms + 44 * MIN, 'u-nacosta', 'Lo pasamos a otro nivel de soporte para revisarlo en profundidad. Te avisamos por acá apenas tengamos novedades.', 'PUBLICO');
      tickets.push(t);
    }
    // 4) Lagomar · Laura: Abierto, atiende Camila. Pando no lo ve.
    {
      const ms = recienteOAyer(185);
      const t = nuevoTicket({
        plantilla: p('p-term-bloqueada'), localidadId: 'loc-lagomar', creador: usu('u-lgomez'), creadoMs: ms, criticidadId: 'cri-alta',
        descripcion: 'La terminal 1 muestra el mensaje de terminal bloqueada y no permite vender.',
      });
      asignar(t, ms + 9 * MIN, 'u-crivero', 'u-crivero');
      comentar(t, ms + 14 * MIN, 'u-crivero', 'Recibimos el ticket y lo estamos revisando.', 'PUBLICO');
      tickets.push(t);
    }
    // 5) Rosario · Ana: Abierto sin asignar.
    tickets.push(nuevoTicket({
      plantilla: p('p-correo-no-llegan'), localidadId: 'loc-rosario', creador: usu('u-arodriguez'), creadoMs: recienteOAyer(70), criticidadId: 'cri-baja',
      descripcion: 'Desde el viernes no nos llegan los correos con los resúmenes diarios.',
    }));
    // 6) Durazno · cargado por Valeria durante una llamada: Abierto, atiende Valeria.
    {
      const t = nuevoTicket({
        plantilla: p('p-liq-no-aparece'), localidadId: 'loc-durazno', creador: usu('u-vpereira'), creadoMs: recienteOAyer(40), criticidadId: 'cri-media',
        descripcion: 'Llaman de Durazno porque no ven la liquidación de hoy. Ayer a esta hora ya estaba disponible.',
      });
      tickets.push(t);
    }
    // 7) Pando · cargado por Valeria: alta de usuario, Abierto.
    tickets.push(nuevoTicket({
      plantilla: p('p-usu-alta'), localidadId: 'loc-pando', creador: usu('u-vpereira'), creadoMs: recienteOAyer(150), criticidadId: 'cri-baja',
      descripcion: 'Marcelo pide un usuario para una cajera nueva que empieza mañana.',
    }));
    // 8) Pando · Marcelo: usuario bloqueado, cerrado ayer con mensaje público.
    {
      const ms = haceDias(1, 11, 5);
      const t = nuevoTicket({
        plantilla: p('p-usu-bloqueado'), localidadId: 'loc-pando', creador: usu('u-mtechera'), creadoMs: ms, criticidadId: 'cri-alta',
        descripcion: 'No podemos ingresar con el usuario del turno de la tarde: dice usuario bloqueado.',
      });
      asignar(t, ms + 6 * MIN, 'u-fnunez', 'u-fnunez');
      comentar(t, ms + 24 * MIN, 'u-fnunez', 'Te enviamos una contraseña temporal al correo del encargado. Cambiala en el primer ingreso.', 'PUBLICO');
      cerrar(t, ms + 25 * MIN, 'u-fnunez', p('p-usu-bloqueado'), true);
      tickets.push(t);
    }
    // 9) Pando · Marcelo: sugerencia cerrada.
    {
      const ms = haceDias(6, 16, 20);
      const t = nuevoTicket({ plantilla: p('p-caja-sugerencia'), localidadId: 'loc-pando', creador: usu('u-mtechera'), creadoMs: ms, criticidadId: 'cri-baja' });
      asignar(t, ms + 40 * MIN, 'u-crivero', 'u-crivero');
      comentar(t, ms + 50 * MIN, 'u-crivero', 'Gracias por la sugerencia. Quedó registrada para que ORMEN la evalúe.', 'PUBLICO');
      cerrar(t, ms + 50 * MIN + 1000, 'u-crivero', p('p-caja-sugerencia'), false);
      tickets.push(t);
    }

    // Numeración por fecha de creación (1001, 1002, ...).
    tickets.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
    tickets.forEach((t, i) => { t.numero = 1001 + i; t.id = 't-' + t.numero; });

    // --- catálogo de soluciones ---
    const soluciones = CATALOGO.map((c, i) => {
      let creadaMs = ahora - (300 - i * 2) * DIA;
      let ticketOrigenId = null;
      if (c.desdeTicket) {
        const origen = tickets.find((t) => t._plantilla === c.desdeTicket && t.cerradoEn);
        if (origen) {
          ticketOrigenId = origen.id;
          creadaMs = new Date(origen.cerradoEn).getTime() + 5 * MIN;
        }
      }
      const revisadaMs = creadaMs + (c.creadaPorId === c.revisadaPorId ? 0 : 20 * HORA);
      return {
        id: c.id, titulo: c.titulo, descripcion: c.descripcion,
        sistemaId: c.sistemaId, subsistemaId: c.subsistemaId, palabrasClave: c.palabrasClave.slice(),
        estado: 'APROBADA', ticketOrigenId,
        creadaPorId: c.creadaPorId, creadaEn: iso(creadaMs),
        revisadaPorId: c.revisadaPorId, revisadaEn: iso(revisadaMs), motivoRechazo: null,
        actualizadaEn: iso(revisadaMs),
        adjuntos: c.imagen ? [{ id: nuevoId('img'), nombre: 'pasos-impresora.png', dataUrl: IMG_PASOS, autorId: c.creadaPorId, fecha: iso(creadaMs) }] : [],
      };
    });
    // Un ticket no puede haber usado una solución que todavía no estaba aprobada.
    const aprobadaEn = new Map(soluciones.map((s) => [s.id, s.revisadaEn]));
    for (const t of tickets) {
      if (t.solucion && t.solucion.solucionCatalogoId && t.solucion.fecha < aprobadaEn.get(t.solucion.solucionCatalogoId)) {
        t.solucion.solucionCatalogoId = null;
      }
      if (t.id === (soluciones.find((s) => s.ticketOrigenId === t.id) || {}).ticketOrigenId) t.solucion.solucionCatalogoId = null;
    }

    // Propuestas pendientes de aprobación y una rechazada.
    const ultimoCerrado = (plantillaId) => tickets.filter((t) => t._plantilla === plantillaId && t.estado === 'CERRADO').pop();
    function propuesta(datos) {
      const base = {
        sistemaId: null, subsistemaId: null, ticketOrigenId: null, estado: 'PENDIENTE',
        revisadaPorId: null, revisadaEn: null, motivoRechazo: null, adjuntos: [],
      };
      const s = Object.assign(base, datos);
      s.actualizadaEn = s.revisadaEn || s.creadaEn;
      soluciones.push(s);
      return s;
    }
    {
      const origen = ultimoCerrado('p-caja-procesando');
      propuesta({
        id: 'sol-prop-caja-procesando', titulo: 'El cierre de caja queda procesando',
        descripcion: '1. Verificar en el sistema central si el cierre quedó registrado.\n2. Si está registrado, pedir a la agencia que recargue la pantalla.\n3. Si no está registrado, repetir el cierre.',
        sistemaId: 'sis-caja', subsistemaId: 'sub-caja-cierre', palabrasClave: ['cierre de caja', 'procesando', 'no termina', 'cargando'],
        ticketOrigenId: origen ? origen.id : null, creadaPorId: origen ? origen.solucion.autorId : 'u-crivero',
        creadaEn: origen ? iso(new Date(origen.cerradoEn).getTime() + 2 * MIN) : iso(ahora - 3 * DIA),
      });
    }
    {
      const origen = ultimoCerrado('p-online-lento');
      propuesta({
        id: 'sol-prop-online-lento', titulo: 'Demora al registrar jugadas por descargas en la red de la agencia',
        descripcion: '1. Preguntar si hay otros equipos usando internet en la agencia.\n2. Pedir que detengan descargas o actualizaciones en curso.\n3. Verificar de nuevo el tiempo de registro de una jugada.',
        sistemaId: 'sis-online', subsistemaId: 'sub-online-jugadas', palabrasClave: ['lento', 'demora', 'jugadas', 'descarga'],
        ticketOrigenId: origen ? origen.id : null, creadaPorId: origen ? origen.solucion.autorId : 'u-nacosta',
        creadaEn: origen ? iso(new Date(origen.cerradoEn).getTime() + 3 * MIN) : iso(ahora - 5 * DIA),
      });
    }
    propuesta({
      id: 'sol-prop-env-incompleto', titulo: 'Pedir el reenvío de un archivo recibido incompleto',
      descripcion: '1. Confirmar con la agencia qué archivo es y de qué fecha.\n2. Pedir el reenvío.\n3. Verificar que el archivo nuevo llegue completo.',
      sistemaId: 'sis-envio-archivos', subsistemaId: 'sub-env-recepcion', palabrasClave: ['archivo incompleto', 'faltan registros', 'reenvío'],
      creadaPorId: 'u-fnunez', creadaEn: iso(ahora - 2 * DIA - 3 * HORA),
    });
    propuesta({
      id: 'sol-rech-reiniciar-todo', titulo: 'Reiniciar todas las terminales ante cualquier error',
      descripcion: 'Ante cualquier error, reiniciar todas las terminales de la agencia.',
      sistemaId: 'sis-todos-terminales', subsistemaId: 'sub-todos-otros', palabrasClave: ['error', 'terminal'],
      creadaPorId: 'u-fnunez', creadaEn: iso(ahora - 40 * DIA), estado: 'RECHAZADA',
      revisadaPorId: 'u-scabrera', revisadaEn: iso(ahora - 39 * DIA),
      motivoRechazo: 'Es demasiado general. Conviene una solución por síntoma, con pasos concretos.',
    });

    // --- borradores de Valeria (bloc de notas durante la atención) ---
    function borrador(datos) {
      const creadoEn = iso(datos.ms);
      return Object.assign({
        id: nuevoId('b'), numero: null, estado: 'BORRADOR', titulo: '', descripcion: '',
        localidadId: '', sistemaId: '', subsistemaId: '', tipoSolicitudId: 'ts-atencion', criticidadId: '', tipoProblemaId: 'tp-nodef',
        creadoPorId: 'u-vpereira', operadorId: 'u-vpereira', creadoEn, actualizadoEn: creadoEn, cerradoEn: null,
        adjuntos: [], solucion: null, registroDirecto: false, actividad: [],
      }, datos, { ms: undefined });
    }
    const borradores = [
      borrador({
        ms: ahora - 15 * MIN, titulo: 'No permite abrir la caja', localidadId: 'loc-carmelo', sistemaId: 'sis-caja', subsistemaId: 'sub-caja-apertura', criticidadId: 'cri-media',
        descripcion: 'Llama Gustavo de Carmelo. No puede abrir la caja; dice que ayer cerraron normal. Verificar si quedó abierta la caja del día anterior.',
      }),
      borrador({
        ms: ahora - 2 * HORA - 10 * MIN, localidadId: 'loc-florida',
        descripcion: 'Florida: preguntan por el reporte de premios del mes pasado. Volver a llamar después de las 15 h.',
      }),
    ];
    borradores.forEach((b) => { delete b.ms; });

    // --- auditoría ---
    const nombreEstado = (e) => (D.ESTADOS[e] ? D.ESTADOS[e].nombre : e);
    const auditoria = [];
    const aud = (fecha, usuarioId, operacion, ticketId, detalle) => auditoria.push({ id: nuevoId('aud'), fecha, usuarioId, operacion, ticketId: ticketId || null, detalle: detalle || '' });
    for (const t of tickets) {
      for (const ev of t.actividad) {
        if (ev.tipo === 'creado') aud(ev.fecha, ev.autorId, 'TICKET_CREADO', t.id, '#' + t.numero + ' · ' + t.titulo);
        else if (ev.tipo === 'comentario') aud(ev.fecha, ev.autorId, ev.visibilidad === 'PRIVADO' ? 'COMENTARIO_PRIVADO' : 'COMENTARIO_PUBLICO', t.id, U.truncar(ev.texto, 90));
        else if (ev.tipo === 'estado') aud(ev.fecha, ev.autorId, 'ESTADO', t.id, nombreEstado(ev.de) + ' → ' + nombreEstado(ev.a));
        else if (ev.tipo === 'asignado') aud(ev.fecha, ev.autorId, 'ASIGNACION', t.id, 'Atiende: ' + (usu(ev.operadorId) || {}).nombre);
        else if (ev.tipo === 'cierre') aud(ev.fecha, ev.autorId, 'CIERRE', t.id, nombreEstado(ev.de) + ' → Cerrado');
        else if (ev.tipo === 'reapertura') aud(ev.fecha, ev.autorId, 'REAPERTURA', t.id, 'Cerrado → Abierto');
      }
    }
    for (const s of soluciones) {
      aud(s.creadaEn, s.creadaPorId, s.ticketOrigenId ? 'SOLUCION_PROPUESTA' : 'SOLUCION_CREADA', s.ticketOrigenId, s.titulo);
      if (s.revisadaEn) aud(s.revisadaEn, s.revisadaPorId, s.estado === 'RECHAZADA' ? 'SOLUCION_RECHAZADA' : 'SOLUCION_APROBADA', null, s.titulo);
    }
    for (let dia = 6; dia >= 0; dia--) {
      for (const uid of ['u-vpereira', 'u-nacosta', 'u-crivero', 'u-fnunez', 'u-scabrera', 'u-mtechera']) {
        if (rnd() < 0.2) continue;
        let ms = haceDias(dia, uid === 'u-scabrera' ? 9 : 8, Math.floor(rnd() * 50));
        if (ms > ahora - 5 * MIN) continue;
        aud(iso(ms), uid, 'LOGIN', null, 'Usuario y contraseña');
      }
    }
    auditoria.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // --- correos simulados de los últimos 60 días ---
    const correos = [];
    for (const t of tickets) {
      const creador = usu(t.creadoPorId);
      if (!creador || creador.rol !== 'CLIENTE') continue;
      let estado = 'ABIERTO';
      const acts = t.actividad;
      const consumidos = new Set();
      for (let i = 0; i < acts.length; i++) {
        const ev = acts[i];
        if (ev.tipo === 'estado') estado = ev.a;
        if (ev.tipo === 'cierre') estado = 'CERRADO';
        if (ev.tipo === 'reapertura') estado = 'ABIERTO';
        if (consumidos.has(ev.id)) continue;
        const actor = usu(ev.autorId);
        if (!actor || actor.rol !== 'OPERADOR') continue;
        if (ahora - new Date(ev.fecha).getTime() > 60 * DIA) continue;
        let motivo = null;
        let detalle = null;
        const sig = acts[i + 1];
        const pegado = (a, b) => b && b.autorId === a.autorId && Math.abs(new Date(b.fecha) - new Date(a.fecha)) <= 5000;
        if (ev.tipo === 'comentario' && ev.visibilidad === 'PUBLICO') {
          if (pegado(ev, sig) && (sig.tipo === 'cierre' || sig.tipo === 'estado')) continue; // va en el correo siguiente
          motivo = 'comentario';
          detalle = 'Mensaje de Mesa de ayuda:\n"' + ev.texto + '"';
        } else if (ev.tipo === 'estado' || ev.tipo === 'cierre' || ev.tipo === 'reapertura') {
          motivo = ev.tipo === 'estado' ? 'estado' : ev.tipo;
          const ant = acts[i - 1];
          if (pegado(ev, sig) && sig.tipo === 'comentario' && sig.visibilidad === 'PUBLICO') {
            detalle = 'Mensaje de Mesa de ayuda:\n"' + sig.texto + '"';
            consumidos.add(sig.id);
          } else if (pegado(ant, ev) && ant.tipo === 'comentario' && ant.visibilidad === 'PUBLICO') {
            detalle = 'Mensaje de Mesa de ayuda:\n"' + ant.texto + '"';
          }
        }
        if (!motivo) continue;
        const { asunto, cuerpo } = D.componerCorreo({ ticket: { numero: t.numero, titulo: t.titulo, estado }, destinatario: creador, actor, motivo, detalle });
        correos.push({ id: nuevoId('mail'), fecha: ev.fecha, ticketId: t.id, paraUsuarioId: creador.id, para: creador.email, asunto, cuerpo });
      }
    }
    correos.sort((a, b) => b.fecha.localeCompare(a.fecha));

    for (const t of tickets) delete t._plantilla;

    return {
      version: VERSION,
      generadoEn: iso(ahora),
      secuencias: { ticket: 1001 + tickets.length },
      usuarios,
      localidades: C.localidades.map((l) => Object.assign({ activa: true }, l)),
      sistemas: C.sistemas.map((x) => Object.assign({ activo: true }, x)),
      subsistemas: C.subsistemas.map((x) => Object.assign({ activo: true }, x)),
      tiposProblema: C.tiposProblema.map((x) => Object.assign({ activo: true }, x)),
      criticidades: C.criticidades.map((x) => Object.assign({ activo: true }, x)),
      tiposSolicitud: C.tiposSolicitud.map((x) => Object.assign({ activo: true }, x)),
      tickets: tickets.concat(borradores),
      soluciones,
      correos,
      auditoria,
      parametros: Object.assign({}, C.parametros),
    };
  }

  App.semilla = { VERSION, generar, imagenes: { error: IMG_ERROR, pasos: IMG_PASOS } };
})(window.App = window.App || {});
