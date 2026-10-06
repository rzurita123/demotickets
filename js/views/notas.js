/* ==========================================================================
   Notas de la demo (pública): qué está confirmado por ORMEN, qué está
   pendiente, qué supuso el equipo para poder mostrarlo y qué queda fuera.
   Mantener al día cuando lleguen respuestas de ORMEN.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  // Fuentes de lo confirmado.
  const F = {
    ormen: 'Respuestas de ORMEN',
    dudas: 'Dudas para ORMEN (respuestas)',
    contexto: 'Contexto a desarrollar',
  };

  const CONFIRMADO = [
    ['Tres roles: Operador de Mesa de ayuda, Administrador y Cliente.', F.ormen],
    ['Por ahora el sistema tiene usuarios propios; la integración con los usuarios de ORMEN y el SSO es a futuro.', F.ormen],
    ['Cada cliente pertenece a una localidad y ve todos los tickets de su localidad, sin jerarquías: Pando no ve los de Lagomar.', F.ormen],
    ['Los tickets que ORMEN crea en nombre de una localidad los ve esa localidad.', F.ormen],
    ['Datos de ingreso: sistema o servicio afectado, subsistema en caso de corresponder, descripción, criticidad y tipo de solicitud (atención o sugerencia de funcionalidad).', F.contexto],
    ['Estados: Abierto (todavía no atendido), En proceso (un operador lo atiende y se ve quién), Bloqueado (por un factor externo) y Cerrado (resuelto). Además, Borrador: sólo lo ve quien lo creó y no cuenta en estadísticas.', F.ormen],
    ['Elevado no es un estado sino un atributo: dice a qué grupo o persona se elevó el ticket. Se puede elevar varias veces y el recorrido se ve en un gráfico.', F.ormen],
    ['Un ticket cerrado se reabre para agregarle comentarios. Todo ticket cerrado tiene su solución.', F.dudas],
    ['Un operador puede registrar un ticket directamente como Cerrado, con el problema y la solución.', F.ormen],
    ['Comentarios públicos (los ve la localidad) y privados (sólo ORMEN).', F.contexto],
    ['Imágenes pegadas o adjuntas, en la descripción y en las soluciones.', F.dudas],
    ['Aviso por correo al creador cuando un operador actualiza el ticket: deseable, no obligatorio.', F.ormen],
    ['Las soluciones son para los operadores y se pueden cargar independientes de un ticket. La wiki de ORMEN queda para procedimientos.', F.dudas],
    ['Las soluciones son una base de conocimiento aparte: conocimiento depurado, reutilizable y aprobado por un administrador. Desde un ticket cerrado se propone un borrador de solución; el ticket sigue existiendo y queda destacado si de él surgió una solución.', F.ormen],
    ['Sugerencias desde el catálogo y desde tickets anteriores del mismo sistema o de la misma localidad, ordenadas por puntaje: mismo sistema y subsistema, más palabras clave en la descripción.', F.dudas],
    ['Estadísticas: la localidad ve las suyas y el seguimiento de sus tickets; gestión ve las generales por sistema y subsistema, fecha, usuario de Mesa de ayuda, tipo de ticket y tipo de problema.', F.contexto],
  ];

  // [qué falta, en qué está]
  const PENDIENTE = [
    ['Integración con la central 3CX. El equipo propuso dos alternativas: transcripción como apoyo, o además una descripción sugerida con IA.', 'Espera la vuelta de Bruno'],
    ['Auditoría: registro propio del sistema o integrado con la que ya tiene ORMEN.', 'Espera la vuelta de Bruno'],
    ['Grupos a los que se eleva un ticket: en la demo son ejemplos (Soporte técnico de 2º nivel, Infraestructura y redes, Desarrollo, Proveedor de terminales).', 'Falta la lista de ORMEN'],
    ['Qué pasa con una solución rechazada por el administrador.', 'A definir con ORMEN'],
    ['Cuántos puntos vale cada criterio de la sugerencia de soluciones.', 'A definir con ORMEN'],
    ['Subsistemas reales: en la demo, salvo «Otros», son ejemplos.', 'Falta la lista de ORMEN'],
    ['Niveles de criticidad: en la demo, Alta, Media y Baja son valores de muestra.', 'ORMEN no los definió'],
    ['A quién avisar por correo cuando el ticket lo carga Mesa de ayuda en nombre de la localidad.', 'A definir'],
    ['WhatsApp y Slack: estaban en las notas originales, pero ORMEN después sólo habló de correo.', 'Sin confirmar si siguen en el alcance'],
    ['Alcance del módulo de usuarios: ORMEN acepta trabajar con una lista predefinida.', 'Consultar con el tutor si ORT espera alta, baja y modificación'],
    ['Migración del histórico del sistema actual (unos 9.000 eventos).', 'Propuesta del equipo, no confirmada por ORMEN'],
  ];

  const SUPUESTOS = [
    'Operadores y administradores ven todas las localidades.',
    'El administrador consulta los tickets pero no los crea ni los trata (no comenta ni cambia estados).',
    'El cliente puede comentar en los tickets de su localidad; sus comentarios son siempre públicos.',
    'La solución del ticket la ve sólo ORMEN; la localidad ve que se cerró y los mensajes públicos.',
    'El tipo de problema lo indica Mesa de ayuda; el cliente no lo elige.',
    '«Atiende»: un operador toma el ticket o se lo asigna a otro, y pasa a En proceso. Si lo carga Mesa de ayuda, queda En proceso a nombre de quien lo carga. Si cierra uno sin asignar, queda a su nombre.',
    'Se eleva un ticket En proceso, con un motivo privado. Si se eleva a una persona de Mesa de ayuda, pasa a atenderlo ella; si se eleva a un grupo, lo sigue quien lo atendía.',
    'Bloqueado pide el motivo y elegir si es público o privado; quien lo atiende lo sigue teniendo. Para elevarlo, primero se desbloquea.',
    'Reabrir deja el ticket En proceso a nombre de quien lo reabre.',
    'El ticket tiene un título además de la descripción.',
    'Los borradores son de Mesa de ayuda.',
    'Las soluciones que carga un operador sin ticket también quedan como borrador hasta que un administrador las apruebe. Un administrador también puede proponer un ticket como solución.',
    'Para rechazar una solución se pide un motivo; queda guardada como rechazada y no se sugiere.',
    'El motivo de una reapertura es privado.',
    'Las estadísticas son para administradores y clientes; los operadores no tienen esa pantalla.',
    'Los puntos de cada criterio y dos criterios extra para tickets anteriores (misma localidad y palabras en común) son de la demo.',
  ];

  const FUERA = [
    'Servidor y base de datos: el sistema real va en .NET (ASP.NET Core y Entity Framework Core) con SQL Server. Acá la base es un JSON: en el navegador o, publicada en Vercel, compartido en Vercel Blob.',
    'Envío real de correos e integraciones con 3CX, WhatsApp y Slack.',
    'Ingreso con los usuarios de ORMEN o por SSO: en la demo todos entran con la contraseña «demo».',
    'HTTPS, protección de datos personales (Ley 18.331) y seguridad del servidor.',
    'Migración del histórico del sistema actual.',
  ];

  // [historia, requerimiento, dónde verlo]
  const TRAZA = [
    ['HU01', 'RF7', 'Nuevo ticket, entrando como operador.'],
    ['HU02', 'RF6', 'Nuevo ticket, entrando como cliente: la localidad queda fija.'],
    ['HU03', 'RF13', 'Soluciones › Buscar por descripción, y las sugerencias al crear y al cerrar un ticket.'],
    ['HU04', 'RF8', 'Tickets: cada usuario ve los de su ámbito, con filtros.'],
    ['HU05', 'RF9', 'Detalle del ticket: estado, quién lo atiende y clasificación.'],
    ['HU06', 'RF10', 'Detalle del ticket: comentario público.'],
    ['HU07', 'RF11', 'Detalle del ticket: comentario privado.'],
    ['HU08', 'RF12', 'Detalle del ticket › Elevar: a un grupo o a una persona. Al hacer clic en «Elevado a…» se ve el recorrido.'],
    ['HU09', 'RF14', 'Cerrar con solución, y proponer el ticket como solución (borrador para el administrador).'],
    ['HU10', 'RF15', 'Cerrar con solución y reabrir.'],
    ['HU11', 'RF16', 'Estadísticas (administrador y cliente).'],
    ['HU12', 'RF3 · RF17', 'Correos simulados. WhatsApp no está en la demo.'],
    ['HU13', 'RF18', 'Slack no está en la demo.'],
    ['HU14', 'RF20', 'Guardar borrador desde Nuevo ticket.'],
    ['HU15', 'RF21', 'Borradores › Continuar.'],
    ['HU16', 'RF22', 'Imágenes en la descripción, los comentarios y las soluciones (también pegadas con Ctrl+V).'],
    ['HU17', 'RF5', 'Administración › Usuarios.'],
    ['HU18', 'RNF4', 'Auditoría, con filtros.'],
    ['—', 'RF1', 'Fuera de la demo: ORMEN pidió usuarios propios por ahora.'],
    ['—', 'RF19', 'Recuadro informativo en Nuevo ticket: 3CX está pendiente.'],
    ['—', 'RNF2', 'Entrando como cliente, abrir por la dirección un ticket de otra localidad: se niega y queda en la auditoría.'],
    ['—', 'RNF7', 'Toda la demo se adapta al celular.'],
    ['—', 'Pedido de ORMEN', 'Soluciones: catálogo con aprobación del administrador (todavía no figura en el anteproyecto).'],
  ];

  function lista(items, clase, icono, conFuente) {
    return h('ul', { class: 'lista-notas' }, items.map((it) => {
      const texto = conFuente ? it[0] : it;
      return h('li', null, h('span', { class: clase }, App.ui.icono(icono, 'i-sm')),
        h('div', null, texto, conFuente && it[1] ? h('span', { class: 'fuente-nota' }, it[1]) : null));
    }));
  }

  function tarjeta(id, titulo, icono, clase, contenido, intro) {
    return h('section', { class: 'card pila', 'aria-labelledby': id },
      h('h2', { id, class: 'fila-sm' }, h('span', { class: clase }, App.ui.icono(icono)), titulo),
      intro ? h('p', { class: 'chico suave' }, intro) : null,
      contenido);
  }

  /** Recorrido para mostrar la demo; los números de ticket salen de los datos actuales. */
  function recorrido() {
    const S = App.store;
    const tickets = S.datos.tickets.filter((t) => t.estado !== 'BORRADOR').sort((a, b) => b.numero - a.numero);
    const pandoSinAsignar = tickets.find((t) => t.localidadId === 'loc-pando' && t.estado === 'ABIERTO' && !t.operadorId);
    const elevado = tickets.find((t) => t.localidadId === 'loc-pando' && t.elevadoA && t.estado !== 'CERRADO');
    const lagomar = tickets.find((t) => t.localidadId === 'loc-lagomar');
    const num = (t) => (t ? h('strong', null, '#' + t.numero) : null);
    return h('ol', { class: 'pila-sm', style: 'margin: 0; padding-left: 20px' },
      h('li', null, h('strong', null, 'Valeria (operadora): '), 'en Inicio, abrí el ticket de Pando sin asignar ', num(pandoSinAsignar),
        '. Mirá las sugerencias, tomalo (pasa a En proceso), dejá un comentario público y otro privado, y cerralo con una solución proponiéndola como solución reutilizable.'),
      h('li', null, h('strong', null, 'Valeria: '), 'abrí el ticket elevado ', num(elevado), ' y hacé clic en «Elevado a…» para ver su recorrido. Elevá otro ticket tuyo a un grupo, o bloquealo por un factor externo.'),
      h('li', null, h('strong', null, 'Marcelo (cliente de Pando), en otra pestaña: '), 've el ticket cerrado, sólo el comentario público y el aviso en «Correos simulados». Probá abrir el ticket de Lagomar ',
        num(lagomar), ' cambiando el número en la dirección.'),
      h('li', null, h('strong', null, 'Silvia (administradora): '), 'revisá y aprobá el borrador de solución en Soluciones (el ticket de origen queda destacado), mirá Estadísticas y encontrá el acceso denegado en Auditoría.'),
      h('li', null, h('strong', null, 'Valeria otra vez: '), 'con «Ya lo resolví» registrá un ticket ya resuelto, y guardá un borrador.'));
  }

  App.vistas.notas = function (ctx) {
    const ui = App.ui;
    const conSesion = !!ctx.usuario;

    return h('div', { class: 'pila-lg' },
      ui.cabecera({
        antetitulo: 'Demo navegable',
        titulo: 'Notas de la demo',
        subtitulo: 'Qué muestra, qué está confirmado por ORMEN, qué falta definir y qué supuso el equipo para poder mostrarlo.',
        acciones: conSesion ? null : [h('a', { class: 'btn btn-primario', href: '#/ingresar' }, 'Ingresar a la demo')],
      }),
      h('div', { class: 'grid-2' },
        h('section', { class: 'card pila', 'aria-labelledby': 'n-uso' },
          h('h2', { id: 'n-uso' }, 'Cómo usarla'),
          h('ul', { class: 'pila-sm', style: 'margin: 0; padding-left: 20px' },
            h('li', null, 'En la pantalla de ingreso hay un acceso rápido por rol. Todos los usuarios de prueba usan la contraseña ', h('strong', null, 'demo'), '.'),
            h('li', null, 'Los datos son ficticios. Publicada en Vercel con la base compartida, todos ven los mismos datos; si no, se guardan sólo en este navegador (lo dice la franja amarilla). «Restablecer datos de la demo», en el menú del usuario, vuelve al punto de partida.'),
            h('li', null, 'Cada pestaña puede tener un usuario distinto: un operador en una y un cliente en otra, y los cambios se ven en las dos.'),
            h('li', null, 'Lo que lleva esta marca está pendiente o a definir: ', ui.pendiente('Pendiente con ORMEN'), '.'))),
        h('section', { class: 'card pila', 'aria-labelledby': 'n-recorrido' },
          h('h2', { id: 'n-recorrido' }, 'Recorrido sugerido'),
          recorrido())),
      h('div', { class: 'notas-grid' },
        tarjeta('n-confirmado', 'Confirmado', 'checkCirculo', 'ok', lista(CONFIRMADO, 'ok', 'check', true), 'Lo que la demo muestra tal como lo definió ORMEN o los documentos del proyecto.'),
        tarjeta('n-pendiente', 'Pendiente', 'pregunta', 'pend', lista(PENDIENTE, 'pend', 'pregunta', true),
          'En la demo llevan la marca dorada. Donde hizo falta mostrar algo, el comportamiento es provisorio y lo dice en pantalla.'),
        tarjeta('n-supuestos', 'Supuestos de la demo', 'info', 'sup', lista(SUPUESTOS, 'sup', 'info'), 'Decisiones del equipo para que la demo funcione. Conviene validarlas con ORMEN.'),
        tarjeta('n-fuera', 'Fuera de la demo', 'xCirculo', 'fuera', lista(FUERA, 'fuera', 'x'), 'Partes del sistema real que no se simulan.')),
      h('section', { class: 'card sin-padding', 'aria-labelledby': 'n-traza' },
        h('div', { class: 'card-titulo', style: 'padding: 18px 20px 0' },
          h('h2', { id: 'n-traza' }, 'Historias de usuario y requerimientos'),
          h('span', { class: 'suave' }, 'Dónde verlos en la demo')),
        h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive tabla-rf' },
          h('caption', { class: 'sr-only' }, 'Historias de usuario y requerimientos, y dónde verlos en la demo'),
          h('thead', null, h('tr', null, ['Historia', 'Requerimiento', 'Dónde verlo'].map((t) => h('th', { scope: 'col' }, t)))),
          h('tbody', null, TRAZA.map(([hu, rf, donde]) => h('tr', null,
            ui.celda('Historia', hu),
            ui.celda('Requerimiento', rf),
            ui.celda('Dónde verlo', donde))))))),
      h('section', { class: 'card pila', 'aria-labelledby': 'n-modificar' },
        h('h2', { id: 'n-modificar' }, 'Cómo modificarla'),
        h('ul', { class: 'pila-sm', style: 'margin: 0; padding-left: 20px' },
          h('li', null, 'Colores y estilos: las variables al principio de ', h('code', null, 'css/styles.css'), ' (paleta de ORMEN).'),
          h('li', null, 'Localidades, sistemas, subsistemas, tipos, usuarios y puntos iniciales: ', h('code', null, 'js/data/catalogos.js'), '.'),
          h('li', null, 'Tickets y soluciones de ejemplo: ', h('code', null, 'js/data/semilla.js'), '. Después de cambiar los datos, subí el número de ', h('code', null, 'VERSION'), ' en ese archivo o usá «Restablecer datos de la demo».'),
          h('li', null, 'Pantallas: una por archivo en ', h('code', null, 'js/views/'), '. Reglas de negocio: ', h('code', null, 'js/store.js'), '. Permisos por rol: ', h('code', null, 'js/auth.js'), '.'),
          h('li', null, 'Cómo publicarla en Vercel: ', h('code', null, 'README.md'), '.'))));
  };
})(window.App = window.App || {});
