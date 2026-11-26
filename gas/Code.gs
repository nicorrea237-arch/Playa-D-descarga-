/**
 * SISTEMA DE GESTIÓN Y GEOLOCALIZACIÓN DE CONTENEDORES - LA EMILIA PLAYA D
 * Operación con Reach Stacker (Containera Terex TFC 45h)
 *
 * Google Apps Script vinculado a Google Sheets + API JSON (doGet / doPost)
 *
 * Reglas de concurrencia: Utiliza LockService para garantizar transacciones atómicas.
 * Aislamiento de datos: Crea y utiliza EXCLUSIVAMENTE las 3 hojas:
 *   - CONTENEDORES
 *   - MOVIMIENTOS
 *   - CONFIG_PLAYA
 * NO toca ni modifica ninguna otra pestaña preexistente (como CONTROLES).
 */

const NOMBRES_HOJAS = {
  CONTENEDORES: 'CONTENEDORES',
  MOVIMIENTOS: 'MOVIMIENTOS',
  CONFIG: 'CONFIG_PLAYA'
};

const ALTURA_MAXIMA_ESTIBA = 5;

const HEADERS_CONTENEDORES = [
  'CODIGO_ISO', 'CALLE', 'FILA', 'NIVEL', 'TIPO', 'NAVIERA',
  'TARA_KG', 'ESTADO', 'FECHA_INGRESO', 'FECHA_RETIRO', 'OBSERVACIONES', 'OPERADOR', 'SECTORES', 'MATERIALES'
];

const HEADERS_MOVIMIENTOS = [
  'ID_MOVIMIENTO', 'TIPO', 'CODIGO_ISO', 'CALLE', 'FILA',
  'NIVEL_ORIGEN', 'NIVEL_DESTINO', 'TIMESTAMP', 'OPERADOR', 'MOTIVO'
];

/**
 * Helper para respuestas JSON compatibles con fetch() externo.
 */
function crearRespuestaJson(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sirve la aplicación web HTML o responde consultas JSON (?action=estado / ?action=ping).
 */
function doGet(e) {
  inicializarEstructura();

  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action ? String(params.action).trim() : '';

  if (action === 'ping') {
    return crearRespuestaJson({
      success: true,
      service: 'LA_EMILIA_PLAYA_D',
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'estado') {
    try {
      const estado = obtenerEstadoPlaya();
      return crearRespuestaJson({
        success: true,
        state: estado,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return crearRespuestaJson({
        success: false,
        error: err && err.message ? err.message : String(err)
      });
    }
  }

  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('La Emilia · Playa D - Gestión de Contenedores')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Endpoint POST JSON para conectar todas las operaciones desde la app externa.
 * Soporta Content-Type: text/plain o application/json.
 * Acciones: estado | ping | ingreso | retiro | clearHistory | resetDemo
 */
function doPost(e) {
  try {
    inicializarEstructura();

    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action ? String(payload.action).trim() : '';

    if (action === 'ping') {
      return crearRespuestaJson({
        success: true,
        service: 'LA_EMILIA_PLAYA_D',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'estado') {
      return crearRespuestaJson({
        success: true,
        state: obtenerEstadoPlaya()
      });
    }

    if (action === 'ingreso') {
      const res = registrarIngreso(payload.data || payload);
      return crearRespuestaJson({
        success: true,
        result: res,
        state: obtenerEstadoPlaya()
      });
    }

    if (action === 'retiro') {
      const res = registrarRetiro(
        payload.codigoISO,
        payload.motivo,
        payload.operador
      );
      return crearRespuestaJson({
        success: true,
        result: res,
        state: obtenerEstadoPlaya()
      });
    }

    if (action === 'clearHistory') {
      const res = limpiarHistorial();
      return crearRespuestaJson({
        success: true,
        result: res,
        state: obtenerEstadoPlaya()
      });
    }

    if (action === 'resetDemo') {
      const res = resetPlayaDemo(payload.containers, payload.movements);
      return crearRespuestaJson({
        success: true,
        result: res,
        state: obtenerEstadoPlaya()
      });
    }

    return crearRespuestaJson({
      success: false,
      error: 'Acción no reconocida: ' + action
    });
  } catch (err) {
    return crearRespuestaJson({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

/**
 * Incluye fragmentos HTML si se requiere modularizar.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Obtiene un mapa { NOMBRE_COLUMNA: indiceZeroBased } de los encabezados de una hoja.
 */
function obtenerMapaColumnas(sheet) {
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    const key = String(headers[i] || '').trim().toUpperCase();
    if (key) {
      map[key] = i;
    }
  }
  return { map: map, totalCols: headers.length };
}

/**
 * Asegura que una columna exista en la hoja CONTENEDORES y devuelve el mapa actualizado.
 */
function asegurarColumnasContenedores(sheet) {
  let info = obtenerMapaColumnas(sheet);
  const faltantes = [];

  HEADERS_CONTENEDORES.forEach(function(h) {
    if (info.map[h] === undefined) {
      faltantes.push(h);
    }
  });

  if (faltantes.length > 0) {
    let nextCol = info.totalCols + 1;
    faltantes.forEach(function(colName) {
      const cell = sheet.getRange(1, nextCol);
      cell.setValue(colName)
        .setBackground('#0f1722')
        .setFontColor('#14b8a6')
        .setFontWeight('bold');
      nextCol++;
    });
    info = obtenerMapaColumnas(sheet);
  }

  return info;
}

/**
 * Crea las 3 hojas necesarias si no existen y escribe sus encabezados.
 * Respeta de forma estricta cualquier otra hoja existente en el libro.
 */
function inicializarEstructura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Hoja CONTENEDORES
  let sheetContenedores = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
  if (!sheetContenedores) {
    sheetContenedores = ss.insertSheet(NOMBRES_HOJAS.CONTENEDORES);
    sheetContenedores.appendRow(HEADERS_CONTENEDORES);
    sheetContenedores.getRange(1, 1, 1, HEADERS_CONTENEDORES.length)
      .setBackground('#0f1722')
      .setFontColor('#14b8a6')
      .setFontWeight('bold');
    sheetContenedores.setFrozenRows(1);
  } else {
    asegurarColumnasContenedores(sheetContenedores);
  }

  // 2. Hoja MOVIMIENTOS
  let sheetMovimientos = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
  if (!sheetMovimientos) {
    sheetMovimientos = ss.insertSheet(NOMBRES_HOJAS.MOVIMIENTOS);
    sheetMovimientos.appendRow(HEADERS_MOVIMIENTOS);
    sheetMovimientos.getRange(1, 1, 1, HEADERS_MOVIMIENTOS.length)
      .setBackground('#0f172a')
      .setFontColor('#14b8a6')
      .setFontWeight('bold');
    sheetMovimientos.setFrozenRows(1);
  }

  // 3. Hoja CONFIG_PLAYA
  let sheetConfig = ss.getSheetByName(NOMBRES_HOJAS.CONFIG);
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet(NOMBRES_HOJAS.CONFIG);
    sheetConfig.appendRow(['PARAMETRO', 'VALOR', 'DESCRIPCION']);
    sheetConfig.appendRow(['CALLES', 'C-01,C-02,C-03,C-04', 'Calles operativas de Playa D']);
    sheetConfig.appendRow(['FILAS_POR_CALLE', '15', 'Cantidad de filas por calle (F-01 a F-15)']);
    sheetConfig.appendRow(['ALTURA_MAXIMA', '5', 'Nivel máximo de apilamiento']);
    sheetConfig.appendRow(['MAQUINA_ID', 'TEREX TFC 45h', 'Identificador de la reach stacker']);
    sheetConfig.appendRow(['DEPOSITO_NOMBRE', 'Terminal Logística La Emilia · Playa D', 'Nombre operativo']);
    sheetConfig.getRange(1, 1, 1, 3)
      .setBackground('#0f172a')
      .setFontColor('#14b8a6')
      .setFontWeight('bold');
    sheetConfig.setFrozenRows(1);
  }

  return { success: true, message: 'Estructura verificada correctamente.' };
}

/**
 * Parsea sectores desde celda de Sheets (JSON array o texto separado por comas).
 */
function parsearSectores(rawVal) {
  if (!rawVal) return [];
  const str = String(rawVal).trim();
  if (!str) return [];
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map(function(s) { return String(s).trim(); }).filter(Boolean);
      }
    } catch (e) {}
  }
  return str.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
}

/**
 * Parsea materiales desde celda de Sheets.
 */
function parsearMateriales(rawVal) {
  if (!rawVal) return [];
  const str = String(rawVal).trim();
  if (!str) return [];
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [{ id: 'MAT-SHEET', descripcion: str, cantidad: 1, unidad: 'BULTOS' }];
}

/**
 * Obtiene el estado consolidado de la playa para la interfaz.
 */
function obtenerEstadoPlaya() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
  let sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
  let sheetCfg = ss.getSheetByName(NOMBRES_HOJAS.CONFIG);

  if (!sheetCont || !sheetMov || !sheetCfg) {
    inicializarEstructura();
    sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
    sheetCfg = ss.getSheetByName(NOMBRES_HOJAS.CONFIG);
  }

  const colInfo = asegurarColumnasContenedores(sheetCont);
  const idx = colInfo.map;

  // Leer Contenedores
  const contenedores = [];
  if (sheetCont.getLastRow() > 1) {
    const data = sheetCont.getRange(2, 1, sheetCont.getLastRow() - 1, colInfo.totalCols).getValues();
    data.forEach(function(row) {
      const iso = row[idx.CODIGO_ISO];
      if (iso) {
        const sectores = idx.SECTORES !== undefined ? parsearSectores(row[idx.SECTORES]) : [];
        const materiales = idx.MATERIALES !== undefined ? parsearMateriales(row[idx.MATERIALES]) : [];
        const fechaIng = row[idx.FECHA_INGRESO];
        const fechaRet = row[idx.FECHA_RETIRO];

        contenedores.push({
          codigoISO: String(iso).trim().toUpperCase(),
          calle: String(row[idx.CALLE] || '').trim(),
          fila: String(row[idx.FILA] || '').trim(),
          nivel: Number(row[idx.NIVEL] || 1),
          tipo: String(row[idx.TIPO] || "40' HC"),
          naviera: String(row[idx.NAVIERA] || 'General'),
          tara: row[idx.TARA_KG] ? Number(row[idx.TARA_KG]) : undefined,
          estado: String(row[idx.ESTADO] || 'DEPOSITADO').trim(),
          fechaIngreso: fechaIng instanceof Date ? fechaIng.toISOString() : String(fechaIng || new Date().toISOString()),
          fechaRetiro: fechaRet ? (fechaRet instanceof Date ? fechaRet.toISOString() : String(fechaRet)) : undefined,
          observaciones: String(row[idx.OBSERVACIONES] || ''),
          operador: String(row[idx.OPERADOR] || 'TEREX-01 / Cabina'),
          sectores: sectores,
          materiales: materiales
        });
      }
    });
  }

  // Leer Movimientos (Últimos 200)
  const movimientos = [];
  if (sheetMov.getLastRow() > 1) {
    const dataMov = sheetMov.getRange(2, 1, sheetMov.getLastRow() - 1, 10).getValues();
    dataMov.forEach(function(row) {
      if (row[0]) {
        movimientos.push({
          id: String(row[0]),
          tipo: String(row[1]),
          codigoISO: String(row[2]),
          calle: String(row[3]),
          fila: String(row[4]),
          nivelOrigen: row[5] !== '' && row[5] !== null ? Number(row[5]) : null,
          nivelDestino: row[6] !== '' && row[6] !== null ? Number(row[6]) : null,
          timestamp: row[7] instanceof Date ? row[7].toISOString() : String(row[7]),
          operador: String(row[8] || ''),
          motivo: String(row[9] || '')
        });
      }
    });
  }

  // Ordenar movimientos por fecha descendente
  movimientos.reverse();

  // Leer Config básica
  let calles = ['C-01', 'C-02', 'C-03', 'C-04'];
  let filasPorCalle = 15;
  let alturaMaxima = ALTURA_MAXIMA_ESTIBA;
  let maquinaId = 'TEREX TFC 45h - Unidad 04';
  let depositoNombre = 'Terminal Logística La Emilia · Playa D';

  if (sheetCfg && sheetCfg.getLastRow() > 1) {
    const cfgRows = sheetCfg.getRange(2, 1, sheetCfg.getLastRow() - 1, 2).getValues();
    cfgRows.forEach(function(r) {
      const k = String(r[0] || '').trim().toUpperCase();
      const v = String(r[1] || '').trim();
      if (k === 'CALLES' && v) calles = v.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      if (k === 'FILAS_POR_CALLE' && v) filasPorCalle = Number(v) || 15;
      if (k === 'ALTURA_MAXIMA' && v) alturaMaxima = Number(v) || ALTURA_MAXIMA_ESTIBA;
      if (k === 'MAQUINA_ID' && v) maquinaId = v;
      if (k === 'DEPOSITO_NOMBRE' && v) depositoNombre = v;
    });
  }

  return {
    contenedores: contenedores,
    activos: contenedores.filter(function(c) { return c.estado === 'DEPOSITADO'; }),
    movimientos: movimientos.slice(0, 200),
    config: {
      calles: calles,
      filasPorCalle: filasPorCalle,
      alturaMaxima: alturaMaxima,
      maquinaId: maquinaId,
      depositoNombre: depositoNombre
    }
  };
}

/**
 * Registra el ingreso de un nuevo contenedor calculando automáticamente el nivel disponible.
 * Utiliza LockService para evitar colisiones entre operadores o terminales.
 */
function registrarIngreso(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('El sistema se encuentra ocupado procesando otra maniobra. Intente nuevamente.');
  }

  try {
    inicializarEstructura();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
    const colInfo = asegurarColumnasContenedores(sheetCont);
    const idx = colInfo.map;

    const cleanCode = String(datos.codigoISO || '').trim().toUpperCase();
    const calle = String(datos.calle || '').trim();
    const fila = String(datos.fila || '').trim();

    if (!cleanCode || !calle || !fila) {
      throw new Error('Faltan datos obligatorios para el ingreso (Código ISO, Calle o Fila).');
    }

    // 1. Validar que no exista un contenedor activo con el mismo código
    const existingStack = [];
    if (sheetCont.getLastRow() > 1) {
      const data = sheetCont.getRange(2, 1, sheetCont.getLastRow() - 1, colInfo.totalCols).getValues();
      for (let i = 0; i < data.length; i++) {
        const rowCode = String(data[i][idx.CODIGO_ISO] || '').trim().toUpperCase();
        const rowEstado = String(data[i][idx.ESTADO] || '').trim();
        const rowCalle = String(data[i][idx.CALLE] || '').trim();
        const rowFila = String(data[i][idx.FILA] || '').trim();
        const rowNivel = Number(data[i][idx.NIVEL]);

        if (rowCode === cleanCode && rowEstado === 'DEPOSITADO') {
          throw new Error('El contenedor ' + cleanCode + ' ya figura DEPOSITADO en ' + rowCalle + ' / ' + rowFila + ' (Nivel ' + rowNivel + ').');
        }

        if (rowCalle === calle && rowFila === fila && rowEstado === 'DEPOSITADO') {
          existingStack.push(rowNivel);
        }
      }
    }

    // 2. Validar altura máxima
    const ocupacionActual = existingStack.length;
    if (ocupacionActual >= ALTURA_MAXIMA_ESTIBA) {
      throw new Error('La fila ' + calle + ' / ' + fila + ' está LLENA (5/5 niveles). No es posible apilar más.');
    }

    // 3. Nivel correlativo automático (nunca deja huecos)
    const nivelAsignado = ocupacionActual + 1;
    const now = new Date();
    const nowIso = now.toISOString();

    const secStr = datos.sectores && Array.isArray(datos.sectores) && datos.sectores.length > 0
      ? datos.sectores.join(', ')
      : '';

    const matStr = datos.materiales && Array.isArray(datos.materiales) && datos.materiales.length > 0
      ? JSON.stringify(datos.materiales)
      : '';

    const nuevaFila = new Array(colInfo.totalCols).fill('');
    nuevaFila[idx.CODIGO_ISO] = cleanCode;
    nuevaFila[idx.CALLE] = calle;
    nuevaFila[idx.FILA] = fila;
    nuevaFila[idx.NIVEL] = nivelAsignado;
    nuevaFila[idx.TIPO] = datos.tipo || "40' HC";
    nuevaFila[idx.NAVIERA] = datos.naviera || 'Carga General';
    nuevaFila[idx.TARA_KG] = datos.tara ? Number(datos.tara) : '';
    nuevaFila[idx.ESTADO] = 'DEPOSITADO';
    nuevaFila[idx.FECHA_INGRESO] = now;
    nuevaFila[idx.FECHA_RETIRO] = '';
    nuevaFila[idx.OBSERVACIONES] = datos.observaciones || '';
    nuevaFila[idx.OPERADOR] = datos.operador || 'TEREX-01 / Cabina';
    nuevaFila[idx.SECTORES] = secStr;
    nuevaFila[idx.MATERIALES] = matStr;

    sheetCont.appendRow(nuevaFila);

    // 4. Registrar movimiento
    const idMov = 'MOV-ING-' + now.getTime();
    sheetMov.appendRow([
      idMov,
      'INGRESO',
      cleanCode,
      calle,
      fila,
      '',
      nivelAsignado,
      now,
      datos.operador || 'TEREX-01 / Cabina',
      datos.observaciones || 'Ingreso registrado en cabina'
    ]);

    SpreadsheetApp.flush();

    return {
      success: true,
      codigoISO: cleanCode,
      calle: calle,
      fila: fila,
      nivel: nivelAsignado,
      timestamp: nowIso
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Registra el retiro de un contenedor desde CUALQUIER nivel.
 * Aplica REACOMODAMIENTO AUTOMÁTICO POR GRAVEDAD a los contenedores superiores.
 * Registra cada descenso en la hoja de MOVIMIENTOS.
 */
function registrarRetiro(codigoISO, motivo, operador) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('El sistema se encuentra ocupado procesando otra maniobra. Intente nuevamente.');
  }

  try {
    inicializarEstructura();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
    const colInfo = asegurarColumnasContenedores(sheetCont);
    const idx = colInfo.map;

    const cleanCode = String(codigoISO || '').trim().toUpperCase();
    const lastRow = sheetCont.getLastRow();

    if (lastRow <= 1) {
      throw new Error('No existen contenedores en el registro.');
    }

    const data = sheetCont.getRange(2, 1, lastRow - 1, colInfo.totalCols).getValues();

    let targetIndex = -1;
    let targetContainer = null;

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][idx.CODIGO_ISO] || '').trim().toUpperCase() === cleanCode && String(data[i][idx.ESTADO] || '').trim() === 'DEPOSITADO') {
        targetIndex = i;
        targetContainer = {
          rowNumber: i + 2,
          codigoISO: cleanCode,
          calle: String(data[i][idx.CALLE] || '').trim(),
          fila: String(data[i][idx.FILA] || '').trim(),
          nivel: Number(data[i][idx.NIVEL])
        };
        break;
      }
    }

    if (!targetContainer) {
      throw new Error('El contenedor ' + cleanCode + ' no fue encontrado o ya no está activo en Playa D.');
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const calle = targetContainer.calle;
    const fila = targetContainer.fila;
    const nivelRetirado = targetContainer.nivel;

    // 1. Dar de baja el contenedor retirado en la hoja CONTENEDORES
    sheetCont.getRange(targetContainer.rowNumber, idx.ESTADO + 1).setValue('RETIRADO');
    sheetCont.getRange(targetContainer.rowNumber, idx.FECHA_RETIRO + 1).setValue(now);

    // 2. Registrar movimiento de RETIRO
    const idMovRetiro = 'MOV-RET-' + now.getTime();
    sheetMov.appendRow([
      idMovRetiro,
      'RETIRO',
      cleanCode,
      calle,
      fila,
      nivelRetirado,
      '',
      now,
      operador || 'TEREX-01 / Cabina',
      motivo || 'Retiro para despacho/traslado'
    ]);

    // 3. REACOMODAMIENTO POR GRAVEDAD
    const reacomodados = [];
    for (let i = 0; i < data.length; i++) {
      if (i === targetIndex) continue;
      const cCalle = String(data[i][idx.CALLE] || '').trim();
      const cFila = String(data[i][idx.FILA] || '').trim();
      const cEstado = String(data[i][idx.ESTADO] || '').trim();
      const cNivel = Number(data[i][idx.NIVEL]);
      const cCodigo = String(data[i][idx.CODIGO_ISO] || '').trim().toUpperCase();

      if (cEstado === 'DEPOSITADO' && cCalle === calle && cFila === fila && cNivel > nivelRetirado) {
        const nuevoNivel = cNivel - 1;
        const rowInSheet = i + 2;

        // Actualizar nivel en hoja
        sheetCont.getRange(rowInSheet, idx.NIVEL + 1).setValue(nuevoNivel);

        // Registrar movimiento individual de REACOMODAMIENTO
        const idMovReac = 'MOV-REA-' + now.getTime() + '-' + (i + 1);
        sheetMov.appendRow([
          idMovReac,
          'REACOMODAMIENTO',
          cCodigo,
          calle,
          fila,
          cNivel,
          nuevoNivel,
          now,
          operador || 'TEREX-01 / Cabina',
          'Descenso por gravedad tras retiro de ' + cleanCode
        ]);

        reacomodados.push({
          codigoISO: cCodigo,
          nivelAnterior: cNivel,
          nuevoNivel: nuevoNivel
        });
      }
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      retirado: {
        codigoISO: cleanCode,
        calle: calle,
        fila: fila,
        nivel: nivelRetirado
      },
      reacomodados: reacomodados,
      timestamp: nowIso
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Limpia el historial de movimientos en la hoja MOVIMIENTOS conservando los encabezados.
 */
function limpiarHistorial() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Sistema ocupado. Intente nuevamente.');
  }

  try {
    inicializarEstructura();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
    const lastRow = sheetMov.getLastRow();
    if (lastRow > 1) {
      sheetMov.deleteRows(2, lastRow - 1);
      SpreadsheetApp.flush();
    }
    return { success: true, clearedRows: Math.max(0, lastRow - 1) };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Restablece la flota de prueba en Sheets (si se pasan contenedores/movimientos desde la app o usa una base mínima).
 */
function resetPlayaDemo(containers, movements) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Sistema ocupado. Intente nuevamente.');
  }

  try {
    inicializarEstructura();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
    const colInfo = asegurarColumnasContenedores(sheetCont);
    const idx = colInfo.map;

    if (sheetCont.getLastRow() > 1) {
      sheetCont.deleteRows(2, sheetCont.getLastRow() - 1);
    }
    if (sheetMov.getLastRow() > 1) {
      sheetMov.deleteRows(2, sheetMov.getLastRow() - 1);
    }

    const listCont = Array.isArray(containers) ? containers : [];
    const listMov = Array.isArray(movements) ? movements : [];

    if (listCont.length > 0) {
      const rowsCont = listCont.map(function(c) {
        const row = new Array(colInfo.totalCols).fill('');
        row[idx.CODIGO_ISO] = String(c.codigoISO || '').toUpperCase();
        row[idx.CALLE] = c.calle || 'C-01';
        row[idx.FILA] = c.fila || 'F-01';
        row[idx.NIVEL] = Number(c.nivel || 1);
        row[idx.TIPO] = c.tipo || "40' HC";
        row[idx.NAVIERA] = c.naviera || 'General';
        row[idx.TARA_KG] = c.tara || '';
        row[idx.ESTADO] = c.estado || 'DEPOSITADO';
        row[idx.FECHA_INGRESO] = c.fechaIngreso ? new Date(c.fechaIngreso) : new Date();
        row[idx.FECHA_RETIRO] = c.fechaRetiro ? new Date(c.fechaRetiro) : '';
        row[idx.OBSERVACIONES] = c.observaciones || '';
        row[idx.OPERADOR] = c.operador || 'TEREX-01 / Cabina';
        row[idx.SECTORES] = Array.isArray(c.sectores) ? c.sectores.join(', ') : '';
        row[idx.MATERIALES] = Array.isArray(c.materiales) && c.materiales.length > 0 ? JSON.stringify(c.materiales) : '';
        return row;
      });
      sheetCont.getRange(2, 1, rowsCont.length, colInfo.totalCols).setValues(rowsCont);
    }

    if (listMov.length > 0) {
      // Guardar en orden cronológico (más viejo primero) para que obtenerEstadoPlaya().reverse() muestre lo más reciente arriba
      const chronological = listMov.slice().reverse();
      const rowsMov = chronological.map(function(m) {
        return [
          m.id || ('MOV-' + new Date().getTime()),
          m.tipo || 'INGRESO',
          String(m.codigoISO || '').toUpperCase(),
          m.calle || 'C-01',
          m.fila || 'F-01',
          m.nivelOrigen !== null && m.nivelOrigen !== undefined ? Number(m.nivelOrigen) : '',
          m.nivelDestino !== null && m.nivelDestino !== undefined ? Number(m.nivelDestino) : '',
          m.timestamp ? new Date(m.timestamp) : new Date(),
          m.operador || 'TEREX-01 / Cabina',
          m.motivo || ''
        ];
      });
      sheetMov.getRange(2, 1, rowsMov.length, 10).setValues(rowsMov);
    }

    SpreadsheetApp.flush();
    return { success: true, count: listCont.length };
  } finally {
    lock.releaseLock();
  }
}
