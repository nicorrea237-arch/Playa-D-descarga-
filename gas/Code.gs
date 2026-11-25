/**
 * SISTEMA DE GESTIÓN Y GEOLOCALIZACIÓN DE CONTENEDORES - PLAYA D
 * Operación con Reach Stacker (Containera Terex)
 * 
 * Google Apps Script vinculado a Google Sheets
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

/**
 * Sirve la aplicación web en el navegador o tablet.
 */
function doGet() {
  inicializarEstructura();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Terex Playa D - Gestión de Contenedores')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Incluye fragmentos HTML si se requiere modularizar.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
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
    const headers = [
      'CODIGO_ISO', 'CALLE', 'FILA', 'NIVEL', 'TIPO', 'NAVIERA', 
      'TARA_KG', 'ESTADO', 'FECHA_INGRESO', 'FECHA_RETIRO', 'OBSERVACIONES', 'OPERADOR', 'MATERIALES'
    ];
    sheetContenedores.appendRow(headers);
    sheetContenedores.getRange(1, 1, 1, headers.length)
      .setBackground('#0f1722')
      .setFontColor('#14b8a6')
      .setFontWeight('bold');
    sheetContenedores.setFrozenRows(1);
  }

  // 2. Hoja MOVIMIENTOS
  let sheetMovimientos = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
  if (!sheetMovimientos) {
    sheetMovimientos = ss.insertSheet(NOMBRES_HOJAS.MOVIMIENTOS);
    const headers = [
      'ID_MOVIMIENTO', 'TIPO', 'CODIGO_ISO', 'CALLE', 'FILA',
      'NIVEL_ORIGEN', 'NIVEL_DESTINO', 'TIMESTAMP', 'OPERADOR', 'MOTIVO'
    ];
    sheetMovimientos.appendRow(headers);
    sheetMovimientos.getRange(1, 1, 1, headers.length)
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
    sheetConfig.appendRow(['ALTURA_MAXIMA', '5', 'Nivel máximo de apilamiento Terex']);
    sheetConfig.appendRow(['MAQUINA_ID', 'TEREX TFC 45h', 'Identificador de la reach stacker']);
    sheetConfig.getRange(1, 1, 1, 3)
      .setBackground('#0f172a')
      .setFontColor('#14b8a6')
      .setFontWeight('bold');
    sheetConfig.setFrozenRows(1);
  }

  return { success: true, message: 'Estructura verificada correctamente.' };
}

/**
 * Obtiene el estado consolidado de la playa para la interfaz.
 */
function obtenerEstadoPlaya() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
  const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
  const sheetCfg = ss.getSheetByName(NOMBRES_HOJAS.CONFIG);

  if (!sheetCont || !sheetMov) {
    inicializarEstructura();
  }

  // Leer Contenedores
  const contenedores = [];
  if (sheetCont.getLastRow() > 1) {
    const numCols = Math.max(13, sheetCont.getLastColumn());
    const data = sheetCont.getRange(2, 1, sheetCont.getLastRow() - 1, numCols).getValues();
    data.forEach(function(row) {
      if (row[0]) {
        let matList = [];
        if (row[12]) {
          try {
            matList = typeof row[12] === 'string' && row[12].startsWith('[') ? JSON.parse(row[12]) : [];
          } catch(e) {
            matList = [{ descripcion: String(row[12]), cantidad: 1, unidad: 'BULTOS' }];
          }
        }

        contenedores.push({
          codigoISO: String(row[0]).trim().toUpperCase(),
          calle: String(row[1]),
          fila: String(row[2]),
          nivel: Number(row[3]),
          tipo: String(row[4]),
          naviera: String(row[5]),
          tara: row[6] ? Number(row[6]) : null,
          estado: String(row[7]),
          fechaIngreso: row[8] instanceof Date ? row[8].toISOString() : String(row[8]),
          fechaRetiro: row[9] ? (row[9] instanceof Date ? row[9].toISOString() : String(row[9])) : '',
          observaciones: String(row[10] || ''),
          operador: String(row[11] || ''),
          materiales: matList
        });
      }
    });
  }

  // Leer Movimientos (Últimos 100)
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
          nivelOrigen: row[5] !== '' ? Number(row[5]) : null,
          nivelDestino: row[6] !== '' ? Number(row[6]) : null,
          timestamp: row[7] instanceof Date ? row[7].toISOString() : String(row[7]),
          operador: String(row[8] || ''),
          motivo: String(row[9] || '')
        });
      }
    });
  }

  // Ordenar movimientos por fecha descendente
  movimientos.reverse();

  return {
    contenedores: contenedores,
    activos: contenedores.filter(function(c) { return c.estado === 'DEPOSITADO'; }),
    movimientos: movimientos.slice(0, 100),
    config: {
      calles: ['C-01', 'C-02', 'C-03', 'C-04'],
      filasPorCalle: 15,
      alturaMaxima: ALTURA_MAXIMA_ESTIBA,
      maquinaId: 'TEREX TFC 45h'
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
    lock.waitLock(30000); // Esperar hasta 30 segundos
  } catch (e) {
    throw new Error('El sistema se encuentra ocupado procesando otra maniobra. Intente nuevamente.');
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);

    const cleanCode = String(datos.codigoISO).trim().toUpperCase();
    const calle = String(datos.calle).trim();
    const fila = String(datos.fila).trim();

    // 1. Validar que no exista un contenedor activo con el mismo código
    let existingStack = [];
    if (sheetCont.getLastRow() > 1) {
      const data = sheetCont.getRange(2, 1, sheetCont.getLastRow() - 1, 12).getValues();
      for (let i = 0; i < data.length; i++) {
        const rowCode = String(data[i][0]).trim().toUpperCase();
        const rowEstado = String(data[i][7]).trim();
        const rowCalle = String(data[i][1]).trim();
        const rowFila = String(data[i][2]).trim();
        const rowNivel = Number(data[i][3]);

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

    const matStr = datos.materiales && Array.isArray(datos.materiales) && datos.materiales.length > 0
      ? JSON.stringify(datos.materiales)
      : '';

    const nuevoContenedor = [
      cleanCode,
      calle,
      fila,
      nivelAsignado,
      datos.tipo || "40' HC",
      datos.naviera || 'Carga General',
      datos.tara ? Number(datos.tara) : '',
      'DEPOSITADO',
      now,
      '',
      datos.observaciones || '',
      datos.operador || 'TEREX-01',
      matStr
    ];

    sheetCont.appendRow(nuevoContenedor);

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
      datos.operador || 'TEREX-01',
      datos.observaciones || 'Ingreso registrado en cabina Terex'
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);

    const cleanCode = String(codigoISO).trim().toUpperCase();
    const lastRow = sheetCont.getLastRow();

    if (lastRow <= 1) {
      throw new Error('No existen contenedores en el registro.');
    }

    const range = sheetCont.getRange(2, 1, lastRow - 1, 12);
    const data = range.getValues();

    let targetIndex = -1;
    let targetContainer = null;

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanCode && String(data[i][7]) === 'DEPOSITADO') {
        targetIndex = i;
        targetContainer = {
          rowNumber: i + 2,
          codigoISO: cleanCode,
          calle: String(data[i][1]),
          fila: String(data[i][2]),
          nivel: Number(data[i][3])
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
    sheetCont.getRange(targetContainer.rowNumber, 8).setValue('RETIRADO');
    sheetCont.getRange(targetContainer.rowNumber, 10).setValue(now);

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
      operador || 'TEREX-01',
      motivo || 'Retiro para despacho/traslado'
    ]);

    // 3. REACOMODAMIENTO POR GRAVEDAD
    // Buscar todos los contenedores activos en la misma Calle y Fila que estaban ARRIBA del retirado
    const reacomodados = [];
    for (let i = 0; i < data.length; i++) {
      if (i === targetIndex) continue;
      const cCalle = String(data[i][1]);
      const cFila = String(data[i][2]);
      const cEstado = String(data[i][7]);
      const cNivel = Number(data[i][3]);
      const cCodigo = String(data[i][0]).trim().toUpperCase();

      if (cEstado === 'DEPOSITADO' && cCalle === calle && cFila === fila && cNivel > nivelRetirado) {
        const nuevoNivel = cNivel - 1;
        const rowInSheet = i + 2;

        // Actualizar nivel en hoja
        sheetCont.getRange(rowInSheet, 4).setValue(nuevoNivel);

        // Registrar movimiento individual de REACOMODAMIENTO
        const idMovReac = 'MOV-REA-' + now.getTime() + '-' + Math.floor(Math.random() * 1000);
        sheetMov.appendRow([
          idMovReac,
          'REACOMODAMIENTO',
          cCodigo,
          calle,
          fila,
          cNivel,
          nuevoNivel,
          now,
          operador || 'TEREX-01',
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
