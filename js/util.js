/* ==========================================================================
   Utilidades generales (DOM, texto, fechas, colecciones).
   Todos los módulos cuelgan de window.App; no hay dependencias externas.
   ========================================================================== */
(function (App) {
  'use strict';

  // ---------------------------------------------------------------- DOM ---

  /**
   * Crea un elemento HTML.
   *   h('button', { class: 'btn', onClick: fn }, 'Texto', otroNodo)
   * Los textos se insertan como nodos de texto (nunca como HTML), así que el
   * contenido que escriben los usuarios no puede inyectar marcado.
   * La clave `html` sólo debe usarse con contenido estático de la demo.
   */
  function h(tag, attrs, ...hijos) {
    const el = document.createElement(tag);
    let valor;
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : v;
        else if (k === 'style') {
          if (typeof v === 'string') el.setAttribute('style', v);
          else Object.assign(el.style, v);
        } else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'value') valor = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      }
    }
    agregar(el, hijos);
    if (valor !== undefined) el.value = valor;
    return el;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  /** Igual que h() pero para elementos SVG. */
  function s(tag, attrs, ...hijos) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else el.setAttribute(k, String(v));
      }
    }
    agregar(el, hijos);
    return el;
  }

  function agregar(el, hijos) {
    for (const c of hijos.flat(Infinity)) {
      if (c == null || c === false || c === true) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function vaciar(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  const $ = (sel, raiz) => (raiz || document).querySelector(sel);
  const $$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));

  // -------------------------------------------------------------- Texto ---

  /** Minúsculas, sin tildes ni signos: "Liquidación diaria!" -> "liquidacion diaria". */
  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function iniciales(nombre) {
    const partes = String(nombre || '?').trim().split(/\s+/);
    const a = partes[0] ? partes[0][0] : '?';
    const b = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (a + b).toUpperCase();
  }

  function plural(n, singular, pluralTxt) {
    return n + ' ' + (n === 1 ? singular : (pluralTxt || singular + 's'));
  }

  function truncar(texto, max) {
    const t = String(texto || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd().replace(/[\s.,;:·-]+$/, '') + '…' : t;
  }

  function capitalizar(t) {
    t = String(t || '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  const numero = new Intl.NumberFormat('es-UY');
  function formatoNumero(n) { return numero.format(n); }
  function porcentaje(parte, total) {
    if (!total) return '0 %';
    return Math.round((parte / total) * 100) + ' %';
  }

  // ------------------------------------------------------------- Fechas ---

  const MIN = 60 * 1000;
  const HORA = 60 * MIN;
  const DIA = 24 * HORA;

  const fmtFecha = new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtHora = new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtMesCorto = new Intl.DateTimeFormat('es-UY', { month: 'short' });
  const fmtMesLargo = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' });
  const fmtDiaMes = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short' });

  const aFecha = (v) => (v instanceof Date ? v : new Date(v));
  function fecha(v) { return v ? fmtFecha.format(aFecha(v)) : ''; }
  function hora(v) { return v ? fmtHora.format(aFecha(v)) : ''; }
  function fechaHora(v) { return v ? fecha(v) + ' ' + hora(v) : ''; }
  function mesCorto(v) { return fmtMesCorto.format(aFecha(v)).replace('.', ''); }
  function mesLargo(v) { return capitalizar(fmtMesLargo.format(aFecha(v))); }
  function diaMes(v) { return fmtDiaMes.format(aFecha(v)).replace('.', ''); }

  function inicioDelDia(v) { const d = new Date(aFecha(v)); d.setHours(0, 0, 0, 0); return d; }

  /** "recién", "hace 5 min", "hace 2 h", "ayer 14:20", "hace 3 días", o la fecha. */
  function relativo(v) {
    if (!v) return '';
    const t = aFecha(v).getTime();
    const ahora = Date.now();
    const dif = ahora - t;
    if (dif < MIN) return 'recién';
    if (dif < HORA) return 'hace ' + Math.floor(dif / MIN) + ' min';
    const hoy = inicioDelDia(ahora).getTime();
    if (t >= hoy) return 'hace ' + Math.floor(dif / HORA) + ' h';
    if (t >= hoy - DIA) return 'ayer ' + hora(v);
    const dias = Math.round((hoy - inicioDelDia(t).getTime()) / DIA);
    if (dias < 7) return 'hace ' + dias + ' días';
    return fecha(v);
  }

  /** Duración legible: "35 min", "4 h 10 min", "3 días". */
  function duracion(ms) {
    if (ms < HORA) return Math.max(1, Math.round(ms / MIN)) + ' min';
    if (ms < DIA) {
      const hs = Math.floor(ms / HORA);
      const mins = Math.round((ms - hs * HORA) / MIN);
      return hs + ' h' + (mins ? ' ' + mins + ' min' : '');
    }
    const d = Math.round(ms / DIA);
    return d + (d === 1 ? ' día' : ' días');
  }

  /** Clave de mes "2026-10" (hora local). */
  function claveMes(v) {
    const d = aFecha(v);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function claveDia(v) {
    const d = aFecha(v);
    return claveMes(d) + '-' + String(d.getDate()).padStart(2, '0');
  }

  function isoAhora() { return new Date().toISOString(); }

  // ---------------------------------------------------------------- Ids ---

  let contadorId = 0;
  function uid(prefijo) {
    contadorId = (contadorId + 1) % 1e6;
    return (prefijo || 'id') + '-' + Date.now().toString(36) + contadorId.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /** Generador pseudoaleatorio con semilla (mulberry32): la semilla da siempre los mismos datos. */
  function prng(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // -------------------------------------------------------- Colecciones ---

  function contarPor(lista, claveFn) {
    const m = new Map();
    for (const x of lista) {
      const k = claveFn(x);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }

  function agruparPor(lista, claveFn) {
    const m = new Map();
    for (const x of lista) {
      const k = claveFn(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    }
    return m;
  }

  function copiar(obj) { return JSON.parse(JSON.stringify(obj)); }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ------------------------------------------------------------ Consulta ---

  function parseQuery(qs) {
    const q = {};
    if (!qs) return q;
    for (const parte of qs.split('&')) {
      if (!parte) continue;
      const [k, v = ''] = parte.split('=');
      q[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
    return q;
  }

  function buildQuery(obj) {
    if (!obj) return '';
    return Object.keys(obj)
      .filter((k) => obj[k] != null && obj[k] !== '')
      .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
      .join('&');
  }

  App.util = {
    h, s, agregar, vaciar, $, $$,
    normalizar, iniciales, plural, truncar, capitalizar, formatoNumero, porcentaje,
    MIN, HORA, DIA, fecha, hora, fechaHora, mesCorto, mesLargo, diaMes, relativo, duracion,
    inicioDelDia, claveMes, claveDia, isoAhora,
    uid, prng, contarPor, agruparPor, copiar, debounce, parseQuery, buildQuery,
  };
})(window.App = window.App || {});
