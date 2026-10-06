/* ==========================================================================
   Sugerencia de soluciones a partir de la descripción del problema.

   Sigue lo que ORMEN contó que hace hoy:
   - Fuentes: el catálogo de soluciones, tickets anteriores del mismo
     sistema o servicio y tickets anteriores de la misma localidad.
   - Puntaje: mismo sistema y subsistema + palabras clave del catálogo que
     aparecen en la descripción. Se ordena por puntaje y el operador elige.

   ORMEN no dijo cuántos puntos vale cada criterio: los pesos son
   provisorios y se cambian en Administración > Parámetros. Para los
   tickets anteriores (que no tienen palabras clave) se cuentan las
   palabras en común con la descripción.
   Sólo se sugieren soluciones aprobadas; las pendientes no.
   ========================================================================== */
(function (App) {
  'use strict';

  const U = App.util;

  // Palabras que no aportan al comparar descripciones.
  const VACIAS = new Set((
    'a al algo algun alguna algunas alguno algunos ante antes asi aun aunque bien cada como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era es esa ese eso esta estaba estan estar este esto estos fue fueron ha hace hacer han hay hasta la las le les lo los mas me mi mientras muy nada ni no nos o otra otro otros otras para pero poco por porque puede pueden que se sea segun ser si sin sobre solo son su sus tambien tiene tienen todo todos todas tras un una uno unos unas y ya ' +
    'agencia agencias cliente clientes sistema dia dias hoy ayer favor hola gracias sigue siguen dice dicen quedo queda nuestro nuestra nuestros cuando desde vez veces bien mal'
  ).split(/\s+/));

  /** Raíz aproximada: alcanza para que "imprime" e "imprimir" coincidan. */
  const raiz = (p) => (p.length >= 6 ? p.slice(0, 5) : p);

  function terminos(texto) {
    return U.normalizar(texto).split(' ').filter((p) => p.length >= 3 && !VACIAS.has(p));
  }

  function raices(texto) {
    return new Set(terminos(texto).map(raiz));
  }

  /** Palabras clave del catálogo que aparecen en el texto. */
  function palabrasClaveEn(texto, palabrasClave, raicesTexto) {
    const rt = raicesTexto || raices(texto);
    const norm = ' ' + U.normalizar(texto) + ' ';
    const res = [];
    for (const pc of palabrasClave || []) {
      const t = terminos(pc).map(raiz);
      const ok = t.length ? t.every((r) => rt.has(r)) : norm.includes(' ' + U.normalizar(pc) + ' ');
      if (ok) res.push(pc);
    }
    return res;
  }

  /** Palabras en común (se devuelven en la forma en que aparecen en el ticket anterior). */
  function palabrasEnComun(raicesTexto, otroTexto) {
    const vistas = new Set();
    const res = [];
    for (const p of terminos(otroTexto)) {
      const r = raiz(p);
      if (raicesTexto.has(r) && !vistas.has(r)) {
        vistas.add(r);
        res.push(p);
      }
    }
    return res;
  }

  /**
   * consulta: { texto, sistemaId, subsistemaId, localidadId, excluirTicketId, parametros, limite }
   * Devuelve resultados ordenados de mayor a menor puntaje.
   */
  function buscar(consulta) {
    const S = App.store;
    const db = S.datos;
    const p = Object.assign({}, db.parametros, consulta.parametros || {});
    const texto = String(consulta.texto || '');
    const rt = raices(texto);
    const hayTexto = rt.size > 0;
    const { sistemaId, subsistemaId, localidadId } = consulta;
    if (!hayTexto && !sistemaId) return [];

    const usos = S.contarUsos();
    const resultados = [];

    // 1) Catálogo de soluciones (sólo aprobadas).
    for (const s of db.soluciones) {
      if (s.estado !== 'APROBADA') continue;
      const motivos = [];
      let puntaje = 0;
      const mismoSistema = !!sistemaId && s.sistemaId === sistemaId;
      const mismoSub = mismoSistema && !!subsistemaId && s.subsistemaId === subsistemaId;
      if (mismoSistema) { puntaje += p.pesoSistema; motivos.push({ texto: 'Mismo sistema', puntos: p.pesoSistema }); }
      if (mismoSub) { puntaje += p.pesoSubsistema; motivos.push({ texto: 'Mismo subsistema', puntos: p.pesoSubsistema }); }
      const claves = hayTexto ? palabrasClaveEn(texto, s.palabrasClave, rt) : [];
      for (const c of claves) {
        puntaje += p.pesoPalabraClave;
        motivos.push({ texto: 'Palabra clave «' + c + '»', puntos: p.pesoPalabraClave });
      }
      const relevante = hayTexto ? claves.length > 0 || mismoSub : mismoSistema && (!subsistemaId || mismoSub || !s.subsistemaId);
      if (!relevante || puntaje <= 0) continue;
      resultados.push({
        tipo: 'catalogo', id: s.id, solucion: s, titulo: s.titulo, texto: s.descripcion,
        sistemaId: s.sistemaId, subsistemaId: s.subsistemaId,
        puntaje, motivos, palabras: claves, usos: usos.get(s.id) || 0, fecha: s.revisadaEn || s.creadaEn,
      });
    }

    // 2) y 3) Tickets anteriores cerrados del mismo sistema o de la misma localidad.
    const porTexto = new Map();
    for (const t of db.tickets) {
      if (t.estado !== 'CERRADO' || !t.solucion || t.id === consulta.excluirTicketId) continue;
      if (t.tipoSolicitudId === 'ts-sugerencia') continue; // las sugerencias de funcionalidad no resuelven problemas
      const mismoSistema = !!sistemaId && t.sistemaId === sistemaId;
      const mismaLocalidad = !!localidadId && t.localidadId === localidadId;
      if (!mismoSistema && !mismaLocalidad && !hayTexto) continue;
      const mismoSub = mismoSistema && !!subsistemaId && t.subsistemaId === subsistemaId;
      const comunes = hayTexto ? palabrasEnComun(rt, t.titulo + ' ' + t.descripcion) : [];
      const relevante = hayTexto
        ? comunes.length >= 2 || (comunes.length >= 1 && (mismoSistema || mismaLocalidad))
        : (subsistemaId ? mismoSub : mismoSistema);
      if (!relevante) continue;
      const motivos = [];
      let puntaje = 0;
      if (mismoSistema) { puntaje += p.pesoSistema; motivos.push({ texto: 'Mismo sistema', puntos: p.pesoSistema }); }
      if (mismoSub) { puntaje += p.pesoSubsistema; motivos.push({ texto: 'Mismo subsistema', puntos: p.pesoSubsistema }); }
      if (mismaLocalidad) { puntaje += p.pesoLocalidad; motivos.push({ texto: 'Misma localidad', puntos: p.pesoLocalidad }); }
      if (comunes.length) {
        const n = Math.min(comunes.length, 5);
        puntaje += n * p.pesoPalabraComun;
        motivos.push({ texto: U.plural(comunes.length, 'palabra en común', 'palabras en común'), puntos: n * p.pesoPalabraComun });
      }
      if (puntaje <= 0) continue;
      const r = {
        tipo: 'ticket', id: t.id, ticket: t, titulo: t.titulo, texto: t.solucion.texto,
        sistemaId: t.sistemaId, subsistemaId: t.subsistemaId,
        puntaje, motivos, palabras: comunes, mismaLocalidad, mismoSistema,
        solucionCatalogoId: t.solucion.solucionCatalogoId, fecha: t.cerradoEn, parecidos: 0,
      };
      // Varios tickets con la misma solución: se muestra el de más puntaje (o el más reciente).
      const clave = U.normalizar(t.solucion.texto);
      const previo = porTexto.get(clave);
      if (!previo) porTexto.set(clave, r);
      else {
        const gana = r.puntaje > previo.puntaje || (r.puntaje === previo.puntaje && r.fecha > previo.fecha);
        const parecidos = previo.parecidos + 1;
        if (gana) { r.parecidos = parecidos; porTexto.set(clave, r); } else previo.parecidos = parecidos;
      }
    }
    resultados.push(...porTexto.values());

    resultados.sort((a, b) =>
      b.puntaje - a.puntaje ||
      (a.tipo === b.tipo ? 0 : a.tipo === 'catalogo' ? -1 : 1) ||
      (b.usos || 0) - (a.usos || 0) ||
      String(b.fecha).localeCompare(String(a.fecha)));

    const limite = consulta.limite || p.maxResultados || 6;
    return resultados.slice(0, limite);
  }

  App.sugerencias = { buscar, palabrasClaveEn, terminos };
})(window.App = window.App || {});
