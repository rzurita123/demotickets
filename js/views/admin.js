/* ==========================================================================
   Administración (rol Administrador):
   - Usuarios: alta, modificación y desactivación (RF5). Alcance a confirmar
     con el tutor; ORMEN acepta una lista de usuarios predefinida.
   - Localidades: cada cliente pertenece a una y ve sus tickets.
   - Catálogos: sistemas, subsistemas, tipos de problema, criticidades y
     tipos de solicitud.
   - Parámetros de la sugerencia de soluciones (puntos provisorios).
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const D = App.dominio;

  const SECCIONES = [
    { clave: 'usuarios', texto: 'Usuarios' },
    { clave: 'localidades', texto: 'Localidades' },
    { clave: 'catalogos', texto: 'Catálogos' },
    { clave: 'parametros', texto: 'Parámetros de sugerencias' },
  ];

  function marco(ctx, op) {
    ctx.titulo(op.titulo);
    return h('div', { class: 'pila' },
      App.ui.cabecera({ antetitulo: 'Administración', titulo: op.titulo, subtitulo: op.subtitulo, acciones: op.acciones }),
      h('nav', { class: 'subnav', 'aria-label': 'Secciones de administración', style: 'margin-bottom: 4px' },
        SECCIONES.map((s) => h('a', { href: '#/admin/' + s.clave, 'aria-current': s.clave === op.seccion ? 'page' : null }, s.texto))),
      op.contenido);
  }

  /** Ventana con un formulario; `guardar` lanza ErrorDemo con campos si algo falta. */
  function modalFormulario(op) {
    const ui = App.ui;
    const cuerpo = h('form', { class: 'pila', novalidate: true }, op.campos);
    const m = ui.modal({
      titulo: op.titulo,
      antetitulo: op.antetitulo || 'Administración',
      cuerpo,
      tamano: op.tamano,
      acciones: [
        { texto: 'Cancelar', clase: 'btn-neutro' },
        {
          texto: op.textoGuardar || 'Guardar', clase: 'btn-primario', fn: () => {
            try {
              op.guardar();
            } catch (e) {
              if (e.campos) { ui.mostrarErrores(cuerpo, e.campos, cuerpo); return false; }
              throw e;
            }
            return true;
          },
        },
      ],
    });
    // Enter en un campo de texto guarda.
    cuerpo.addEventListener('submit', (e) => { e.preventDefault(); m.botones[m.botones.length - 1].click(); });
    return m;
  }

  /** "Valeria Pereira" -> "vpereira", como los usuarios de la demo. */
  function sugerirUsuario(nombre) {
    const p = U.normalizar(nombre).split(' ').filter(Boolean);
    if (!p.length) return '';
    return (p.length > 1 ? p[0][0] + p[p.length - 1] : p[0]).slice(0, 30);
  }

  // ----------------------------------------------------------- Usuarios ---

  const ROLES_FILTRO = [
    { clave: 'todos', texto: 'Todos' },
    { clave: 'OPERADOR', texto: 'Operadores' },
    { clave: 'ADMINISTRADOR', texto: 'Administradores' },
    { clave: 'CLIENTE', texto: 'Clientes' },
  ];

  App.vistas.adminUsuarios = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const q = Object.assign({ rol: 'todos' }, ctx.query);
    if (!ROLES_FILTRO.some((r) => r.clave === q.rol)) q.rol = 'todos';

    const inBuscar = h('input', { id: 'u-buscar', class: 'control', type: 'search', placeholder: 'Nombre, usuario o correo', value: q.q || '' });
    const selLoc = ui.select({ id: 'u-loc', vacio: 'Todas', valor: q.loc, opciones: S.localidades().map((l) => ({ valor: l.id, texto: l.nombre })) });
    const selEstado = ui.select({ id: 'u-estado', vacio: 'Activos e inactivos', valor: q.estado, opciones: [{ valor: 'activos', texto: 'Sólo activos' }, { valor: 'inactivos', texto: 'Sólo inactivos' }] });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Rol' });
    const resultados = h('div');
    const total = h('p', { class: 'chico suave', 'aria-live': 'polite' });

    function filtrar(sinRol) {
      const texto = U.normalizar(q.q);
      return S.usuarios().filter((x) =>
        (sinRol || q.rol === 'todos' || x.rol === q.rol) &&
        (!texto || U.normalizar(x.nombre + ' ' + x.usuario + ' ' + x.email).indexOf(texto) >= 0) &&
        (!q.loc || x.localidadId === q.loc) &&
        (!q.estado || (q.estado === 'activos' ? x.activo !== false : x.activo === false)));
    }

    function cambiar(k, v) {
      q[k] = v || '';
      const limpio = {};
      ['q', 'rol', 'loc', 'estado'].forEach((c) => { if (q[c] && !(c === 'rol' && q[c] === 'todos')) limpio[c] = q[c]; });
      App.router.actualizarQuery(limpio);
      pintar();
    }

    async function alternarActivo(x) {
      const activar = x.activo === false;
      if (!activar) {
        const ok = await ui.confirmar({
          titulo: 'Desactivar a ' + x.nombre,
          mensaje: 'No va a poder ingresar al sistema. Sus tickets, comentarios y soluciones se conservan, y lo podés volver a activar cuando quieras.',
          textoConfirmar: 'Desactivar',
          peligro: true,
        });
        if (!ok) return;
      }
      try {
        S.cambiarActivoUsuario(x.id, u, activar);
        ui.toast(x.nombre + (activar ? ' puede volver a ingresar.' : ' ya no puede ingresar.'));
        ctx.refrescar();
      } catch (e) { ui.mostrarError(e); }
    }

    function abrirFormulario(existente) {
      const inNombre = h('input', { id: 'f-nombre', class: 'control', type: 'text', autocomplete: 'off', value: existente ? existente.nombre : '' });
      const inUsuario = h('input', { id: 'f-usuario', class: 'control', type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none', value: existente ? existente.usuario : '' });
      const inEmail = h('input', { id: 'f-email', class: 'control', type: 'email', autocomplete: 'off', value: existente ? existente.email : '' });
      const inCargo = h('input', { id: 'f-cargo', class: 'control', type: 'text', autocomplete: 'off', value: existente ? existente.cargo || '' : '', placeholder: 'Por ejemplo: Encargado, Mesa de ayuda' });
      const ayudaRol = h('span');
      const selLocF = ui.select({
        id: 'f-localidad', vacio: 'Elegí la localidad', valor: existente ? existente.localidadId : '',
        opciones: S.localidades().filter((l) => l.activa !== false || (existente && existente.localidadId === l.id)).map((l) => ({ valor: l.id, texto: l.nombre })),
      });
      const campoLoc = ui.campo({ nombre: 'localidadId', id: 'f-localidad', etiqueta: 'Localidad', requerido: true, control: selLocF, ayuda: 'El cliente ve todos los tickets de su localidad.' });
      function alCambiarRol(v) {
        campoLoc.hidden = v !== 'CLIENTE';
        ayudaRol.textContent = D.ROLES[v] ? D.ROLES[v].descripcion + (v === 'CLIENTE' ? '' : ' Ve todas las localidades (supuesto de la demo).') : '';
      }
      const segRol = ui.segmentado({
        nombre: 'f-rol', valor: existente ? existente.rol : '',
        opciones: Object.keys(D.ROLES).map((k) => ({ valor: k, texto: D.ROLES[k].nombre })),
        onChange: alCambiarRol,
      });
      alCambiarRol(existente ? existente.rol : '');
      let usuarioTocado = !!existente;
      inUsuario.addEventListener('input', () => { usuarioTocado = true; });
      inNombre.addEventListener('input', () => { if (!usuarioTocado) inUsuario.value = sugerirUsuario(inNombre.value); });
      const esYo = existente && existente.id === u.id;

      modalFormulario({
        titulo: existente ? 'Editar usuario' : 'Nuevo usuario',
        textoGuardar: existente ? 'Guardar cambios' : 'Crear usuario',
        campos: [
          ui.campo({ nombre: 'nombre', id: 'f-nombre', etiqueta: 'Nombre y apellido', requerido: true, control: inNombre }),
          h('div', { class: 'grid-2' },
            ui.campo({ nombre: 'usuario', id: 'f-usuario', etiqueta: 'Usuario', requerido: true, control: inUsuario, ayuda: 'Para ingresar. Sin tildes ni espacios.' }),
            ui.campo({ nombre: 'email', id: 'f-email', etiqueta: 'Correo', requerido: true, control: inEmail, ayuda: 'Ahí llegan los avisos de sus tickets.' })),
          ui.grupo({ nombre: 'rol', etiqueta: 'Rol', requerido: true, control: segRol, ayuda: esYo ? 'No podés quitarte el rol de administrador.' : ayudaRol }),
          campoLoc,
          ui.campo({ nombre: 'cargo', id: 'f-cargo', etiqueta: 'Cargo', opcional: true, control: inCargo }),
          h('p', { class: 'chico suave' }, existente
            ? 'La contraseña no se cambia desde acá. En la demo todos ingresan con «demo».'
            : 'En la demo todos los usuarios ingresan con la contraseña «demo». Cómo se entregan las contraseñas en el sistema real depende del alcance del módulo de usuarios.'),
        ],
        guardar: () => {
          const datos = {
            nombre: inNombre.value, usuario: inUsuario.value, email: inEmail.value,
            rol: ui.valorRadio(segRol, 'f-rol'), localidadId: selLocF.value, cargo: inCargo.value,
          };
          const r = S.guardarUsuario(datos, u, existente ? existente.id : null);
          ui.toast(existente ? 'Cambios guardados.' : 'Usuario «' + r.usuario + '» creado. Ingresa con la contraseña «demo».');
          ctx.refrescar();
        },
      });
    }

    function pintar() {
      U.vaciar(chips);
      const base = filtrar(true);
      ROLES_FILTRO.forEach((r) => {
        const n = r.clave === 'todos' ? base.length : base.filter((x) => x.rol === r.clave).length;
        chips.append(h('button', { type: 'button', class: 'chip', 'aria-pressed': String(q.rol === r.clave), onClick: () => cambiar('rol', r.clave) }, r.texto, h('span', { class: 'cuenta' }, n)));
      });
      const lista = filtrar(false);
      total.textContent = U.plural(lista.length, 'usuario', 'usuarios');
      U.vaciar(resultados);
      if (!lista.length) {
        resultados.append(ui.vacio({ icono: 'usuarios', titulo: 'No hay usuarios con estos filtros' }));
        return;
      }
      const filas = lista.map((x) => {
        const inactivo = x.activo === false;
        const esYo = x.id === u.id;
        return h('tr', null,
          ui.celda('Usuario', h('div', { class: 'fila-sm', style: 'flex-wrap: nowrap' },
            ui.avatar(x),
            h('div', { class: 'titulo-celda', style: 'min-width: 0' },
              h('span', null, x.nombre, esYo ? h('span', { class: 'badge contorno', style: 'margin-left: 8px' }, 'Vos') : null),
              h('span', { class: 'sub', style: 'overflow-wrap: anywhere' }, x.usuario + ' · ' + x.email))), 'sin-label'),
          ui.celda('Rol', h('div', null, ui.nombreRol(x), x.cargo ? h('span', { class: 'sub suave chico', style: 'display: block' }, x.cargo) : null)),
          ui.celda('Localidad', x.rol === 'CLIENTE' ? S.nombre('localidades', x.localidadId) : h('span', { class: 'suave' }, 'Todas')),
          ui.celda('Estado', inactivo ? h('span', { class: 'badge inactivo' }, 'Inactivo') : h('span', { class: 'badge aprobada' }, 'Activo')),
          ui.celda('', h('div', { class: 'fila-sm', style: 'justify-content: flex-end; flex-wrap: nowrap' },
            h('button', { type: 'button', class: 'btn btn-secundario btn-sm', onClick: () => abrirFormulario(x), 'aria-label': 'Editar a ' + x.nombre }, ui.icono('editar', 'i-sm'), 'Editar'),
            esYo
              ? h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', style: 'min-width: 104px', 'aria-disabled': 'true', title: 'No podés desactivar tu propio usuario', onClick: () => ui.toast('No podés desactivar tu propio usuario.', { tipo: 'aviso' }) }, 'Desactivar')
              : h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', style: 'min-width: 104px', onClick: () => alternarActivo(x), 'aria-label': (inactivo ? 'Activar a ' : 'Desactivar a ') + x.nombre }, inactivo ? 'Activar' : 'Desactivar')), 'derecha sin-label'));
      });
      resultados.append(h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
        h('caption', { class: 'sr-only' }, 'Usuarios'),
        h('thead', null, h('tr', null, ['Usuario', 'Rol', 'Localidad', 'Estado', ''].map((t) => h('th', { scope: 'col' }, t || h('span', { class: 'sr-only' }, 'Acciones'))))),
        h('tbody', null, filas))));
    }

    inBuscar.addEventListener('input', U.debounce(() => cambiar('q', inBuscar.value.trim()), 200));
    selLoc.addEventListener('change', () => cambiar('loc', selLoc.value));
    selEstado.addEventListener('change', () => cambiar('estado', selEstado.value));
    pintar();

    return marco(ctx, {
      seccion: 'usuarios',
      titulo: 'Usuarios',
      subtitulo: 'Usuarios propios del sistema: Mesa de ayuda, gestión de ORMEN y clientes de cada localidad.',
      acciones: [h('button', { type: 'button', class: 'btn btn-primario', onClick: () => abrirFormulario(null) }, ui.icono('usuarioMas', 'i-sm'), 'Nuevo usuario')],
      contenido: [
        ui.avisoPendiente('Alcance del módulo de usuarios',
          'ORMEN acepta trabajar con una lista de usuarios predefinida, pero falta consultar con el tutor si ORT espera un módulo completo de alta, baja y modificación. La integración con los usuarios de ORMEN y el SSO quedan para más adelante.'),
        h('section', { class: 'card sin-padding', 'aria-label': 'Listado de usuarios' },
          h('div', { style: 'padding: 18px 20px 6px' },
            h('div', { class: 'filtros', role: 'search', 'aria-label': 'Filtros de usuarios' },
              ui.campo({ nombre: 'q', id: 'u-buscar', etiqueta: 'Buscar', control: inBuscar, clase: 'buscar' }),
              ui.campo({ nombre: 'loc', id: 'u-loc', etiqueta: 'Localidad', control: selLoc }),
              ui.campo({ nombre: 'estado', id: 'u-estado', etiqueta: 'Estado', control: selEstado })),
            h('div', { class: 'fila-entre', style: 'margin-bottom: 12px' }, chips, total)),
          resultados),
      ],
    });
  };

  // -------------------------------------------------------- Localidades ---

  App.vistas.adminLocalidades = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const db = S.datos;
    const registrados = db.tickets.filter((t) => t.estado !== 'BORRADOR');
    const tickets = U.contarPor(registrados, (t) => t.localidadId);
    const enCurso = U.contarPor(registrados.filter((t) => D.ESTADOS_ACTIVOS.includes(t.estado)), (t) => t.localidadId);
    const clientes = U.contarPor(db.usuarios.filter((x) => x.rol === 'CLIENTE' && x.activo !== false), (x) => x.localidadId);

    function abrir(existente) {
      const inNombre = h('input', { id: 'l-nombre', class: 'control', type: 'text', autocomplete: 'off', value: existente ? existente.nombre : '' });
      modalFormulario({
        titulo: existente ? 'Renombrar localidad' : 'Nueva localidad',
        tamano: 'angosto',
        textoGuardar: existente ? 'Guardar' : 'Crear localidad',
        campos: [ui.campo({ nombre: 'nombre', id: 'l-nombre', etiqueta: 'Nombre', requerido: true, control: inNombre, ayuda: existente ? 'Los tickets y usuarios de la localidad no cambian.' : 'Después podés crear sus usuarios cliente.' })],
        guardar: () => {
          const l = S.guardarLocalidad({ nombre: inNombre.value }, u, existente ? existente.id : null);
          ui.toast(existente ? 'Localidad renombrada.' : 'Localidad «' + l.nombre + '» creada.');
          ctx.refrescar();
        },
      });
    }

    async function alternar(l) {
      const activar = l.activa === false;
      if (!activar) {
        const ok = await ui.confirmar({
          titulo: 'Desactivar ' + l.nombre,
          mensaje: 'No se va a poder elegir en tickets ni usuarios nuevos, y sus usuarios no van a poder crear tickets. Los ' + U.plural(tickets.get(l.id) || 0, 'ticket', 'tickets') + ' que tiene se conservan.',
          textoConfirmar: 'Desactivar',
          peligro: true,
        });
        if (!ok) return;
      }
      try {
        S.cambiarActivaLocalidad(l.id, u, activar);
        ui.toast(l.nombre + (activar ? ' está activa.' : ' quedó inactiva.'));
        ctx.refrescar();
      } catch (e) { ui.mostrarError(e); }
    }

    const filas = S.localidades().map((l) => {
      const inactiva = l.activa === false;
      return h('tr', null,
        ui.celda('Localidad', h('span', { class: 'titulo-celda' }, l.nombre), 'sin-label'),
        ui.celda('Usuarios cliente', h('span', { class: 'mono' }, U.formatoNumero(clientes.get(l.id) || 0)), 'numero'),
        ui.celda('Tickets', h('span', { class: 'mono' }, U.formatoNumero(tickets.get(l.id) || 0)), 'numero'),
        ui.celda('En curso', h('span', { class: 'mono' }, U.formatoNumero(enCurso.get(l.id) || 0)), 'numero'),
        ui.celda('Estado', inactiva ? h('span', { class: 'badge inactivo' }, 'Inactiva') : h('span', { class: 'badge aprobada' }, 'Activa')),
        ui.celda('', h('div', { class: 'fila-sm', style: 'justify-content: flex-end; flex-wrap: nowrap' },
          h('button', { type: 'button', class: 'btn btn-secundario btn-sm', 'aria-label': 'Renombrar ' + l.nombre, onClick: () => abrir(l) }, ui.icono('editar', 'i-sm'), 'Renombrar'),
          h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', onClick: () => alternar(l) }, inactiva ? 'Activar' : 'Desactivar')), 'derecha sin-label'));
    });

    return marco(ctx, {
      seccion: 'localidades',
      titulo: 'Localidades',
      subtitulo: 'Bancas y agencias. Cada usuario cliente pertenece a una localidad y ve todos sus tickets, sin jerarquías: Pando no ve los de Lagomar.',
      acciones: [h('button', { type: 'button', class: 'btn btn-primario', onClick: () => abrir(null) }, ui.icono('mas', 'i-sm'), 'Nueva localidad')],
      contenido: h('section', { class: 'card sin-padding', 'aria-label': 'Localidades' }, h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla responsive' },
        h('caption', { class: 'sr-only' }, 'Localidades'),
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, 'Localidad'),
          h('th', { scope: 'col', class: 'numero' }, 'Usuarios cliente'),
          h('th', { scope: 'col', class: 'numero' }, 'Tickets'),
          h('th', { scope: 'col', class: 'numero' }, 'En curso'),
          h('th', { scope: 'col' }, 'Estado'),
          h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Acciones')))),
        h('tbody', null, filas)))),
    });
  };

  // ---------------------------------------------------------- Catálogos ---

  App.vistas.adminCatalogos = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const registrados = S.datos.tickets.filter((t) => t.estado !== 'BORRADOR');
    const usos = {
      sistemas: U.contarPor(registrados, (t) => t.sistemaId),
      subsistemas: U.contarPor(registrados, (t) => t.subsistemaId),
      tiposProblema: U.contarPor(registrados, (t) => t.tipoProblemaId),
      criticidades: U.contarPor(registrados, (t) => t.criticidadId),
      tiposSolicitud: U.contarPor(registrados, (t) => t.tipoSolicitudId),
      gruposSoporte: U.contarPor(registrados, (t) => (t.elevadoA && t.elevadoA.tipo === 'grupo' ? t.elevadoA.id : null)),
    };
    const SINGULAR = { sistemas: 'sistema', subsistemas: 'subsistema', tiposProblema: 'tipo de problema', criticidades: 'criticidad', tiposSolicitud: 'tipo de solicitud', gruposSoporte: 'grupo de soporte' };

    function abrir(tipo, item, sistemaId) {
      const inNombre = h('input', { id: 'c-nombre', class: 'control', type: 'text', autocomplete: 'off', value: item ? item.nombre : '' });
      const sis = sistemaId ? S.sistema(sistemaId) : null;
      modalFormulario({
        titulo: item ? 'Renombrar ' + SINGULAR[tipo] : 'Nuevo ' + SINGULAR[tipo] + (sis ? ' de ' + sis.nombre : ''),
        antetitulo: 'Catálogos',
        tamano: 'angosto',
        textoGuardar: item ? 'Guardar' : 'Agregar',
        campos: [
          ui.campo({ nombre: 'nombre', id: 'c-nombre', etiqueta: 'Nombre', requerido: true, control: inNombre,
            ayuda: item && item.ejemplo ? 'Al renombrarlo deja de figurar como ejemplo.' : item ? 'Los tickets que ya lo usan muestran el nombre nuevo.' : null }),
        ],
        guardar: () => {
          S.guardarItemCatalogo(tipo, { nombre: inNombre.value, sistemaId }, u, item ? item.id : null);
          ui.toast(item ? 'Cambios guardados.' : U.capitalizar(SINGULAR[tipo]) + ' agregado.');
          ctx.refrescar();
        },
      });
    }

    function alternar(tipo, item) {
      const activar = item.activo === false;
      try {
        S.cambiarActivoItem(tipo, item.id, u, activar);
        ctx.refrescar();
        ui.toast('«' + item.nombre + '» ' + (activar ? 'vuelve a estar disponible.' : 'ya no se puede elegir en tickets nuevos.'), {
          accion: { texto: 'Deshacer', fn: () => { try { S.cambiarActivoItem(tipo, item.id, u, !activar); ctx.refrescar(); } catch (e) { ui.mostrarError(e); } } },
        });
      } catch (e) { ui.mostrarError(e); }
    }

    function pastilla(tipo, item) {
      const inactivo = item.activo === false;
      const n = usos[tipo].get(item.id) || 0;
      return h('li', { class: ['item-catalogo', inactivo && 'inactivo'], title: U.plural(n, 'ticket', 'tickets') },
        h('span', { class: 'nombre-item' }, item.nombre),
        item.ejemplo ? h('span', { class: 'badge ejemplo' }, 'ejemplo') : null,
        inactivo ? h('span', { class: 'sr-only' }, '(inactivo)') : null,
        h('button', { type: 'button', 'aria-label': 'Renombrar «' + item.nombre + '»', onClick: () => abrir(tipo, item, item.sistemaId) }, ui.icono('editar', 'i-sm')),
        h('button', { type: 'button', 'aria-label': (inactivo ? 'Activar' : 'Desactivar') + ' «' + item.nombre + '»', title: inactivo ? 'Activar' : 'Desactivar', onClick: () => alternar(tipo, item) },
          ui.icono(inactivo ? 'reabrir' : 'x', 'i-sm')));
    }

    function tarjetaLista(tipo, titulo, origen, extra) {
      return h('section', { class: 'card pila', 'aria-labelledby': 'cat-' + tipo },
        h('div', { class: 'fila-entre' },
          h('h2', { id: 'cat-' + tipo }, titulo),
          h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => abrir(tipo, null) }, ui.icono('mas', 'i-sm'), 'Agregar')),
        h('p', { class: 'chico suave' }, origen, extra ? [' ', extra] : null),
        h('ul', { class: 'lista-items' }, S.catalogo(tipo).map((x) => pastilla(tipo, x))));
    }

    const arbol = h('div', { class: 'arbol' }, S.sistemas().map((s) => {
      const inactivo = s.activo === false;
      const subs = S.subsistemasDe(s.id);
      return h('div', { class: ['arbol-sistema', inactivo && 'inactivo'] },
        h('div', { class: 'fila-entre' },
          h('div', { class: 'fila-sm' },
            h('strong', { class: 'nombre-item', style: 'color: var(--tinta)' }, s.nombre),
            inactivo ? h('span', { class: 'badge inactivo' }, 'Inactivo') : null,
            h('span', { class: 'chico suave' }, U.plural(usos.sistemas.get(s.id) || 0, 'ticket', 'tickets'))),
          h('div', { class: 'fila-sm' },
            h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', onClick: () => abrir('subsistemas', null, s.id) }, ui.icono('mas', 'i-sm'), 'Subsistema'),
            h('button', { type: 'button', class: 'btn btn-fantasma btn-sm btn-icono', 'aria-label': 'Renombrar el sistema ' + s.nombre, title: 'Renombrar', onClick: () => abrir('sistemas', s) }, ui.icono('editar', 'i-sm')),
            h('button', { type: 'button', class: 'btn btn-fantasma btn-sm', onClick: () => alternar('sistemas', s) }, inactivo ? 'Activar' : 'Desactivar'))),
        subs.length
          ? h('ul', null, subs.map((x) => pastilla('subsistemas', x)))
          : h('p', { class: 'chico suave', style: 'padding: 8px 14px 10px' }, 'Sin subsistemas.'));
    }));

    return marco(ctx, {
      seccion: 'catalogos',
      titulo: 'Catálogos',
      subtitulo: 'Las opciones para clasificar los tickets. Desactivar algo no cambia los tickets que ya lo usan: sólo deja de aparecer en los nuevos.',
      contenido: [
        h('section', { class: 'card pila', 'aria-labelledby': 'cat-sistemas' },
          h('div', { class: 'fila-entre' },
            h('h2', { id: 'cat-sistemas' }, 'Sistemas y subsistemas'),
            h('button', { type: 'button', class: 'btn btn-neutro btn-sm', onClick: () => abrir('sistemas', null) }, ui.icono('mas', 'i-sm'), 'Nuevo sistema')),
          h('p', { class: 'chico suave' }, 'Los sistemas son los del sistema actual (Atención a Clientes v1.0z). De los subsistemas, sólo «Otros» figura en el sistema actual; los marcados como «ejemplo» son de muestra. ',
            ui.pendiente('Faltan los subsistemas reales', 'Reemplazar los de ejemplo por los subsistemas reales de ORMEN.')),
          arbol),
        h('div', { class: 'grid-3' },
          tarjetaLista('tiposProblema', 'Tipos de problema', 'Los del sistema actual. Los indica Mesa de ayuda al tratar el ticket.'),
          tarjetaLista('criticidades', 'Criticidades', 'Valores de muestra.', ui.pendiente('A definir', 'ORMEN no definió los niveles de criticidad.')),
          tarjetaLista('tiposSolicitud', 'Tipos de solicitud', 'Los del documento «Contexto a desarrollar».')),
        tarjetaLista('gruposSoporte', 'Grupos de soporte', 'A quién se puede elevar un ticket, además de las personas de Mesa de ayuda.', ui.pendiente('Grupos de ejemplo', 'ORMEN todavía no definió los grupos reales.')),
      ],
    });
  };

  // --------------------------------------------------------- Parámetros ---

  const CAMPOS_PARAMETROS = [
    { k: 'pesoSistema', etiqueta: 'Mismo sistema', origen: 'Criterio de ORMEN.' },
    { k: 'pesoSubsistema', etiqueta: 'Mismo subsistema', origen: 'Criterio de ORMEN.' },
    { k: 'pesoPalabraClave', etiqueta: 'Cada palabra clave del catálogo que aparece en la descripción', origen: 'Criterio de ORMEN.' },
    { k: 'pesoLocalidad', etiqueta: 'Ticket anterior de la misma localidad', origen: 'Agregado en la demo: ORMEN nombró estos tickets como fuente, pero no cómo suman.' },
    { k: 'pesoPalabraComun', etiqueta: 'Cada palabra en común con un ticket anterior (hasta 5)', origen: 'Agregado en la demo: los tickets anteriores no tienen palabras clave.' },
    { k: 'maxResultados', etiqueta: 'Cantidad de sugerencias que se muestran', origen: 'Al crear y al cerrar un ticket.' },
  ];

  App.vistas.adminParametros = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const u = ctx.usuario;
    const actuales = S.datos.parametros;
    const entradas = {};

    const form = h('form', { class: 'card pila', novalidate: true, 'aria-labelledby': 'sec-pesos' });
    const resumen = h('div');
    CAMPOS_PARAMETROS.forEach((c) => {
      const [min, max] = S.LIMITES_PARAMETROS[c.k];
      entradas[c.k] = h('input', { id: 'p-' + c.k, class: 'control', type: 'number', inputmode: 'numeric', min: String(min), max: String(max), step: '1', value: String(actuales[c.k]) });
    });
    const leer = () => {
      const p = {};
      CAMPOS_PARAMETROS.forEach((c) => { p[c.k] = entradas[c.k].value; });
      return p;
    };

    // Prueba en vivo con los valores del formulario (aunque no estén guardados).
    const inPrueba = h('textarea', { id: 'p-prueba', class: 'control', rows: '3', value: 'La impresora de la terminal no imprime el comprobante' });
    const selSis = ui.select({ id: 'p-sis', vacio: 'Sin elegir', valor: 'sis-control-terminales', opciones: S.sistemas(true).map((s) => ({ valor: s.id, texto: s.nombre })) });
    const resultados = h('div', { class: 'sugerencias' });
    const estado = h('p', { class: 'chico suave', 'aria-live': 'polite' });
    function probar() {
      const p = {};
      for (const c of CAMPOS_PARAMETROS) {
        const v = Number(entradas[c.k].value);
        const [min, max] = S.LIMITES_PARAMETROS[c.k];
        p[c.k] = Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : actuales[c.k];
      }
      const res = App.sugerencias.buscar({ texto: inPrueba.value, sistemaId: selSis.value, parametros: p, limite: p.maxResultados });
      U.vaciar(resultados);
      estado.textContent = res.length ? U.plural(res.length, 'sugerencia', 'sugerencias') + ' con estos valores.' : 'Sin sugerencias para esta descripción.';
      res.forEach((r, i) => resultados.append(ui.tarjetaSugerencia(r, { mejor: i === 0 })));
    }
    const probarDiferido = U.debounce(probar, 200);
    inPrueba.addEventListener('input', probarDiferido);
    selSis.addEventListener('change', probar);

    form.append(
      h('h2', { id: 'sec-pesos' }, 'Puntos de cada criterio'),
      resumen,
      h('div', { class: 'pila' }, CAMPOS_PARAMETROS.map((c) => {
        const [min, max] = S.LIMITES_PARAMETROS[c.k];
        return ui.campo({ nombre: c.k, id: 'p-' + c.k, etiqueta: c.etiqueta, control: entradas[c.k], ayuda: c.origen + ' Entre ' + min + ' y ' + max + '.' });
      })),
      h('div', { class: 'fila' },
        h('button', { type: 'submit', class: 'btn btn-primario' }, ui.icono('check', 'i-sm'), 'Guardar'),
        h('button', {
          type: 'button', class: 'btn btn-neutro', onClick: () => {
            CAMPOS_PARAMETROS.forEach((c) => { entradas[c.k].value = String(App.catalogos.parametros[c.k]); });
            ctx.marcarSucio(true);
            probar();
            ui.toast('Se cargaron los valores iniciales de la demo. Guardá para aplicarlos.', { tipo: 'aviso' });
          },
        }, ui.icono('refrescar', 'i-sm'), 'Valores iniciales')));
    form.addEventListener('input', (e) => { if (e.target.type === 'number') { ctx.marcarSucio(true); probarDiferido(); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        S.guardarParametros(leer(), u);
        ctx.marcarSucio(false);
        ui.limpiarErrores(form);
        ui.toast('Parámetros guardados: las sugerencias ya usan los valores nuevos.');
      } catch (err) {
        if (err.campos) ui.mostrarErrores(form, err.campos, resumen);
        else ui.mostrarError(err);
      }
    });
    setTimeout(probar, 0);

    return marco(ctx, {
      seccion: 'parametros',
      titulo: 'Parámetros de sugerencias',
      subtitulo: 'Cuántos puntos suma cada criterio al sugerir soluciones. Las sugerencias se ordenan de mayor a menor puntaje.',
      contenido: [
        ui.avisoPendiente('Puntos provisorios',
          'ORMEN explicó cómo calcula hoy las sugerencias (mismo sistema y subsistema, más las palabras clave del catálogo que aparecen en la descripción) pero no cuántos puntos vale cada criterio. Estos valores son de la demo.'),
        h('div', { class: 'dos-columnas-anchas' },
          form,
          h('aside', { class: 'pila' }, h('section', { class: 'card pila', 'aria-labelledby': 'sec-probar' },
            h('h2', { id: 'sec-probar' }, 'Probar con una descripción'),
            h('p', { class: 'chico suave' }, 'Usa los valores del formulario, aunque todavía no los hayas guardado.'),
            ui.campo({ nombre: 'prueba', id: 'p-prueba', etiqueta: 'Descripción del problema', control: inPrueba }),
            ui.campo({ nombre: 'sis', id: 'p-sis', etiqueta: 'Sistema', opcional: true, control: selSis }),
            estado,
            resultados))),
      ],
    });
  };
})(window.App = window.App || {});
