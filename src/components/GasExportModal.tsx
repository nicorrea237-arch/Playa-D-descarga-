import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  FileCode,
  Download,
  ShieldCheck,
  RefreshCw,
  Link2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { DEFAULT_GAS_WEB_APP_URL, GasConnectionStatus } from '../services/gasSyncService';

interface GasExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasUrl: string;
  gasStatus: GasConnectionStatus;
  gasStatusMessage?: string;
  isSyncing: boolean;
  onSaveAndTestUrl: (newUrl: string) => Promise<void>;
  onResetDefaultUrl: () => void;
}

export const GasExportModal: React.FC<GasExportModalProps> = ({
  isOpen,
  onClose,
  gasUrl,
  gasStatus,
  gasStatusMessage,
  isSyncing,
  onSaveAndTestUrl,
  onResetDefaultUrl,
}) => {
  const [activeFile, setActiveFile] = useState<'Code.gs' | 'index.html'>('Code.gs');
  const [copied, setCopied] = useState(false);
  const [draftUrl, setDraftUrl] = useState(gasUrl);

  useEffect(() => {
    setDraftUrl(gasUrl);
  }, [gasUrl, isOpen]);

  if (!isOpen) return null;

  const codeGsContent = `/**
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

function crearRespuestaJson(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  inicializarEstructura();

  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action ? String(params.action).trim() : '';

  if (action === 'ping') {
    return crearRespuestaJson({ success: true, service: 'LA_EMILIA_PLAYA_D', timestamp: new Date().toISOString() });
  }

  if (action === 'estado') {
    try {
      return crearRespuestaJson({ success: true, state: obtenerEstadoPlaya(), timestamp: new Date().toISOString() });
    } catch (err) {
      return crearRespuestaJson({ success: false, error: err && err.message ? err.message : String(err) });
    }
  }

  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('La Emilia · Playa D - Gestión de Contenedores')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    inicializarEstructura();
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action ? String(payload.action).trim() : '';

    if (action === 'ping') {
      return crearRespuestaJson({ success: true, service: 'LA_EMILIA_PLAYA_D', timestamp: new Date().toISOString() });
    }
    if (action === 'estado') {
      return crearRespuestaJson({ success: true, state: obtenerEstadoPlaya() });
    }
    if (action === 'ingreso') {
      const res = registrarIngreso(payload.data || payload);
      return crearRespuestaJson({ success: true, result: res, state: obtenerEstadoPlaya() });
    }
    if (action === 'retiro') {
      const res = registrarRetiro(payload.codigoISO, payload.motivo, payload.operador);
      return crearRespuestaJson({ success: true, result: res, state: obtenerEstadoPlaya() });
    }
    if (action === 'clearHistory') {
      const res = limpiarHistorial();
      return crearRespuestaJson({ success: true, result: res, state: obtenerEstadoPlaya() });
    }
    if (action === 'resetDemo') {
      const res = resetPlayaDemo(payload.containers, payload.movements);
      return crearRespuestaJson({ success: true, result: res, state: obtenerEstadoPlaya() });
    }

    return crearRespuestaJson({ success: false, error: 'Acción no reconocida: ' + action });
  } catch (err) {
    return crearRespuestaJson({ success: false, error: err && err.message ? err.message : String(err) });
  }
}

function obtenerMapaColumnas(sheet) {
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    const key = String(headers[i] || '').trim().toUpperCase();
    if (key) map[key] = i;
  }
  return { map: map, totalCols: headers.length };
}

function asegurarColumnasContenedores(sheet) {
  let info = obtenerMapaColumnas(sheet);
  const faltantes = [];
  HEADERS_CONTENEDORES.forEach(function(h) {
    if (info.map[h] === undefined) faltantes.push(h);
  });
  if (faltantes.length > 0) {
    let nextCol = info.totalCols + 1;
    faltantes.forEach(function(colName) {
      sheet.getRange(1, nextCol).setValue(colName).setBackground('#0f1722').setFontColor('#14b8a6').setFontWeight('bold');
      nextCol++;
    });
    info = obtenerMapaColumnas(sheet);
  }
  return info;
}

function inicializarEstructura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheetContenedores = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
  if (!sheetContenedores) {
    sheetContenedores = ss.insertSheet(NOMBRES_HOJAS.CONTENEDORES);
    sheetContenedores.appendRow(HEADERS_CONTENEDORES);
    sheetContenedores.getRange(1, 1, 1, HEADERS_CONTENEDORES.length)
      .setBackground('#0f1722').setFontColor('#14b8a6').setFontWeight('bold');
    sheetContenedores.setFrozenRows(1);
  } else {
    asegurarColumnasContenedores(sheetContenedores);
  }

  let sheetMovimientos = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
  if (!sheetMovimientos) {
    sheetMovimientos = ss.insertSheet(NOMBRES_HOJAS.MOVIMIENTOS);
    sheetMovimientos.appendRow(HEADERS_MOVIMIENTOS);
    sheetMovimientos.getRange(1, 1, 1, HEADERS_MOVIMIENTOS.length)
      .setBackground('#0f172a').setFontColor('#14b8a6').setFontWeight('bold');
    sheetMovimientos.setFrozenRows(1);
  }

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
      .setBackground('#0f172a').setFontColor('#14b8a6').setFontWeight('bold');
    sheetConfig.setFrozenRows(1);
  }

  return { success: true, message: 'Estructura lista.' };
}

function parsearSectores(rawVal) {
  if (!rawVal) return [];
  const str = String(rawVal).trim();
  if (!str) return [];
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map(function(s) { return String(s).trim(); }).filter(Boolean);
    } catch (e) {}
  }
  return str.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
}

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
  const contenedores = [];

  if (sheetCont.getLastRow() > 1) {
    const data = sheetCont.getRange(2, 1, sheetCont.getLastRow() - 1, colInfo.totalCols).getValues();
    data.forEach(function(row) {
      const iso = row[idx.CODIGO_ISO];
      if (iso) {
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
          sectores: idx.SECTORES !== undefined ? parsearSectores(row[idx.SECTORES]) : [],
          materiales: idx.MATERIALES !== undefined ? parsearMateriales(row[idx.MATERIALES]) : []
        });
      }
    });
  }

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
  movimientos.reverse();

  return {
    contenedores: contenedores,
    activos: contenedores.filter(function(c) { return c.estado === 'DEPOSITADO'; }),
    movimientos: movimientos.slice(0, 200),
    config: {
      calles: ['C-01', 'C-02', 'C-03', 'C-04'],
      filasPorCalle: 15,
      alturaMaxima: ALTURA_MAXIMA_ESTIBA,
      maquinaId: 'TEREX TFC 45h - Unidad 04',
      depositoNombre: 'Terminal Logística La Emilia · Playa D'
    }
  };
}

function registrarIngreso(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Sistema ocupado procesando otra maniobra.');
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

    let existingCount = 0;
    if (sheetCont.getLastRow() > 1) {
      const data = sheetCont.getRange(2, 1, sheetCont.getLastRow() - 1, colInfo.totalCols).getValues();
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][idx.CODIGO_ISO]).trim().toUpperCase() === cleanCode && String(data[i][idx.ESTADO]) === 'DEPOSITADO') {
          throw new Error('El contenedor ' + cleanCode + ' ya está activo en Playa D.');
        }
        if (String(data[i][idx.CALLE]) === calle && String(data[i][idx.FILA]) === fila && String(data[i][idx.ESTADO]) === 'DEPOSITADO') {
          existingCount++;
        }
      }
    }

    if (existingCount >= ALTURA_MAXIMA_ESTIBA) {
      throw new Error('La fila ' + calle + ' / ' + fila + ' está LLENA (5/5).');
    }

    const nivelAsignado = existingCount + 1;
    const now = new Date();
    const secStr = datos.sectores && Array.isArray(datos.sectores) && datos.sectores.length > 0 ? datos.sectores.join(', ') : '';
    const matStr = datos.materiales && Array.isArray(datos.materiales) && datos.materiales.length > 0 ? JSON.stringify(datos.materiales) : '';

    const nuevaFila = new Array(colInfo.totalCols).fill('');
    nuevaFila[idx.CODIGO_ISO] = cleanCode;
    nuevaFila[idx.CALLE] = calle;
    nuevaFila[idx.FILA] = fila;
    nuevaFila[idx.NIVEL] = nivelAsignado;
    nuevaFila[idx.TIPO] = datos.tipo || "40' HC";
    nuevaFila[idx.NAVIERA] = datos.naviera || 'General';
    nuevaFila[idx.TARA_KG] = datos.tara ? Number(datos.tara) : '';
    nuevaFila[idx.ESTADO] = 'DEPOSITADO';
    nuevaFila[idx.FECHA_INGRESO] = now;
    nuevaFila[idx.FECHA_RETIRO] = '';
    nuevaFila[idx.OBSERVACIONES] = datos.observaciones || '';
    nuevaFila[idx.OPERADOR] = datos.operador || 'TEREX-01 / Cabina';
    nuevaFila[idx.SECTORES] = secStr;
    nuevaFila[idx.MATERIALES] = matStr;

    sheetCont.appendRow(nuevaFila);

    sheetMov.appendRow([
      'MOV-ING-' + now.getTime(), 'INGRESO', cleanCode, calle, fila,
      '', nivelAsignado, now, datos.operador || 'TEREX-01 / Cabina',
      datos.observaciones || 'Ingreso registrado en cabina'
    ]);

    SpreadsheetApp.flush();
    return { success: true, codigoISO: cleanCode, nivel: nivelAsignado };
  } finally {
    lock.releaseLock();
  }
}

function registrarRetiro(codigoISO, motivo, operador) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Sistema ocupado procesando otra maniobra.');
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
    if (lastRow <= 1) throw new Error('No hay contenedores registrados.');

    const data = sheetCont.getRange(2, 1, lastRow - 1, colInfo.totalCols).getValues();
    let targetIndex = -1;
    let targetContainer = null;

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][idx.CODIGO_ISO]).trim().toUpperCase() === cleanCode && String(data[i][idx.ESTADO]) === 'DEPOSITADO') {
        targetIndex = i;
        targetContainer = {
          rowNumber: i + 2,
          calle: String(data[i][idx.CALLE]),
          fila: String(data[i][idx.FILA]),
          nivel: Number(data[i][idx.NIVEL])
        };
        break;
      }
    }

    if (!targetContainer) throw new Error('Contenedor ' + cleanCode + ' no encontrado activo.');

    const now = new Date();
    sheetCont.getRange(targetContainer.rowNumber, idx.ESTADO + 1).setValue('RETIRADO');
    sheetCont.getRange(targetContainer.rowNumber, idx.FECHA_RETIRO + 1).setValue(now);

    sheetMov.appendRow([
      'MOV-RET-' + now.getTime(), 'RETIRO', cleanCode,
      targetContainer.calle, targetContainer.fila,
      targetContainer.nivel, '', now, operador || 'TEREX-01 / Cabina',
      motivo || 'Retiro para despacho'
    ]);

    for (let i = 0; i < data.length; i++) {
      if (i === targetIndex) continue;
      const cCalle = String(data[i][idx.CALLE]);
      const cFila = String(data[i][idx.FILA]);
      const cEstado = String(data[i][idx.ESTADO]);
      const cNivel = Number(data[i][idx.NIVEL]);
      const cCodigo = String(data[i][idx.CODIGO_ISO]).trim().toUpperCase();

      if (cEstado === 'DEPOSITADO' && cCalle === targetContainer.calle && cFila === targetContainer.fila && cNivel > targetContainer.nivel) {
        const nuevoNivel = cNivel - 1;
        sheetCont.getRange(i + 2, idx.NIVEL + 1).setValue(nuevoNivel);
        sheetMov.appendRow([
          'MOV-REA-' + now.getTime() + '-' + (i + 1), 'REACOMODAMIENTO',
          cCodigo, cCalle, cFila, cNivel, nuevoNivel, now,
          operador || 'TEREX-01 / Cabina', 'Descenso por gravedad tras retiro de ' + cleanCode
        ]);
      }
    }

    SpreadsheetApp.flush();
    return { success: true, codigoISO: cleanCode };
  } finally {
    lock.releaseLock();
  }
}

function limpiarHistorial() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Sistema ocupado.');
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
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function resetPlayaDemo(containers, movements) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Sistema ocupado.');
  }
  try {
    inicializarEstructura();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);
    const colInfo = asegurarColumnasContenedores(sheetCont);
    const idx = colInfo.map;

    if (sheetCont.getLastRow() > 1) sheetCont.deleteRows(2, sheetCont.getLastRow() - 1);
    if (sheetMov.getLastRow() > 1) sheetMov.deleteRows(2, sheetMov.getLastRow() - 1);

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
}`;

  const currentContent =
    activeFile === 'Code.gs'
      ? codeGsContent
      : `<!-- Ver archivo completo /gas/index.html en la raíz del proyecto -->
<!-- Incluye interfaz La Emilia · Playa D con Modo Diurno/Nocturno, 8 Sectores y google.script.run conectado -->`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 dark:bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#151e27] border-2 border-slate-300 dark:border-[#233140] w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-[#0f1722] px-5 py-4 border-b border-slate-200 dark:border-[#233140] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 rounded-lg text-teal-700 dark:text-teal-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white tracking-wide text-lg font-mono">
                CONEXIÓN GOOGLE SHEETS &amp; APPS SCRIPT
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Sincronización en tiempo real de ingresos, retiros, reacomodamientos e historial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Live GAS Endpoint Configuration */}
        <div className="p-4 bg-slate-50 dark:bg-[#0d141d] border-b border-slate-200 dark:border-[#233140] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <Link2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              URL Web App de Google Apps Script (/exec)
            </label>
            <button
              type="button"
              onClick={() => {
                setDraftUrl(DEFAULT_GAS_WEB_APP_URL);
                onResetDefaultUrl();
              }}
              className="text-[11px] font-mono text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300 flex items-center gap-1 underline"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar URL configurada
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://script.google.com/.../exec"
              className="flex-1 h-11 bg-white dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] focus:border-teal-500 rounded-lg px-3 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="button"
              disabled={isSyncing || !draftUrl.trim()}
              onClick={() => onSaveAndTestUrl(draftUrl)}
              className="h-11 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-black font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'CONECTANDO...' : 'PROBAR Y SINCRONIZAR'}
            </button>
          </div>

          {/* Connection status feedback */}
          <div
            className={`px-3 py-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
              gasStatus === 'connected'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                : gasStatus === 'auth_required' || gasStatus === 'script_outdated'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-300'
                : 'bg-white dark:bg-[#151e27] border-slate-300 dark:border-[#233140] text-slate-700 dark:text-slate-300'
            }`}
          >
            {gasStatus === 'connected' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">
                {gasStatus === 'connected'
                  ? 'CONEXIÓN ACTIVA CON GOOGLE SHEETS'
                  : gasStatus === 'auth_required'
                  ? 'ACCESO RESTRINGIDO O CORS BLOQUEADO EN APPS SCRIPT'
                  : gasStatus === 'script_outdated'
                  ? 'EL SCRIPT ACTUAL NO DEVUELVE JSON (?action=estado)'
                  : 'ESTADO LOCAL / SIN VERIFICAR'}
              </div>
              {gasStatusMessage && <div className="leading-snug opacity-90">{gasStatusMessage}</div>}
              {gasStatus !== 'connected' && (
                <div className="text-[11px] opacity-85 pt-0.5">
                  Para habilitar la sincronización automática desde esta pantalla: copiá el{' '}
                  <strong>Code.gs</strong> de abajo en tu proyecto de Apps Script y en{' '}
                  <strong>Implementar ➔ Nueva implementación (Aplicación web)</strong> elegí{' '}
                  <em>&quot;Quién tiene acceso: Cualquier usuario&quot;</em>.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security / Isolation notice */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-500/30 px-4 py-2 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>AISLAMIENTO ESTRICTO:</strong> Opera únicamente las hojas{' '}
            <code className="text-emerald-950 dark:text-white bg-emerald-100 dark:bg-black/40 px-1 rounded">CONTENEDORES</code>,{' '}
            <code className="text-emerald-950 dark:text-white bg-emerald-100 dark:bg-black/40 px-1 rounded">MOVIMIENTOS</code> y{' '}
            <code className="text-emerald-950 dark:text-white bg-emerald-100 dark:bg-black/40 px-1 rounded">CONFIG_PLAYA</code>.
          </span>
        </div>

        {/* File selector tabs */}
        <div className="bg-slate-100 dark:bg-[#0b1117] px-4 pt-2 border-b border-slate-200 dark:border-[#233140] flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFile('Code.gs')}
              className={`px-4 py-2 font-mono text-xs font-bold rounded-t-lg transition-all ${
                activeFile === 'Code.gs'
                  ? 'bg-white dark:bg-[#151e27] text-teal-800 dark:text-teal-300 border-t-2 border-teal-600 dark:border-teal-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Code.gs (API JSON + LockService)
            </button>
            <button
              onClick={() => setActiveFile('index.html')}
              className={`px-4 py-2 font-mono text-xs font-bold rounded-t-lg transition-all ${
                activeFile === 'index.html'
                  ? 'bg-white dark:bg-[#151e27] text-teal-800 dark:text-teal-300 border-t-2 border-teal-600 dark:border-teal-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              index.html (Standalone GAS)
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-black text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '¡Copiado!' : 'Copiar Código'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1 bg-white hover:bg-slate-200 dark:bg-[#1e293b] dark:hover:bg-[#334155] text-slate-800 dark:text-slate-200 text-xs font-mono rounded flex items-center gap-1.5 transition-all border border-slate-300 dark:border-[#233140]"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar {activeFile}
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div className="p-4 flex-1 overflow-auto bg-slate-50 dark:bg-[#0b1117]">
          <pre className="font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
            {currentContent}
          </pre>
        </div>

        {/* Footer instructions */}
        <div className="bg-slate-50 dark:bg-[#0f1722] p-3 border-t border-slate-200 dark:border-[#233140] text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center justify-between">
          <span>Ubicación en workspace: <code className="text-teal-700 dark:text-teal-400">/gas/{activeFile}</code></span>
          <span className="text-[11px] text-slate-500">Google Sheets ➔ Extensiones ➔ Apps Script</span>
        </div>
      </div>
    </div>
  );
};
