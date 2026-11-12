import React, { useState } from 'react';
import { X, Copy, Check, FileCode, ExternalLink, Download, ShieldCheck } from 'lucide-react';

interface GasExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GasExportModal: React.FC<GasExportModalProps> = ({ isOpen, onClose }) => {
  const [activeFile, setActiveFile] = useState<'Code.gs' | 'index.html'>('Code.gs');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // We can fetch or provide the exact clean code templates
  const codeGsContent = `/**
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

function doGet() {
  inicializarEstructura();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Terex Playa D - Gestión de Contenedores')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

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
      .setBackground('#0f172a').setFontColor('#14b8a6').setFontWeight('bold');
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
      .setBackground('#0f172a').setFontColor('#14b8a6').setFontWeight('bold');
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
      .setBackground('#0f172a').setFontColor('#14b8a6').setFontWeight('bold');
    sheetConfig.setFrozenRows(1);
  }

  return { success: true, message: 'Estructura lista.' };
}

function registrarIngreso(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('Sistema ocupado procesando otra maniobra.');
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);

    const cleanCode = String(datos.codigoISO).trim().toUpperCase();
    const calle = String(datos.calle).trim();
    const fila = String(datos.fila).trim();

    let existingCount = 0;
    if (sheetCont.getLastRow() > 1) {
      const data = sheetCont.getRange(2, 1, sheetCont.getLastRow() - 1, 8).getValues();
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === cleanCode && String(data[i][7]) === 'DEPOSITADO') {
          throw new Error('El contenedor ' + cleanCode + ' ya está activo en Playa D.');
        }
        if (String(data[i][1]) === calle && String(data[i][2]) === fila && String(data[i][7]) === 'DEPOSITADO') {
          existingCount++;
        }
      }
    }

    if (existingCount >= ALTURA_MAXIMA_ESTIBA) {
      throw new Error('La fila ' + calle + ' / ' + fila + ' está LLENA (5/5).');
    }

    const nivelAsignado = existingCount + 1;
    const now = new Date();

    const matStr = datos.materiales && datos.materiales.length > 0 ? JSON.stringify(datos.materiales) : '';

    sheetCont.appendRow([
      cleanCode, calle, fila, nivelAsignado,
      datos.tipo || "40' HC", datos.naviera || 'General',
      datos.tara || '', 'DEPOSITADO', now, '',
      datos.observaciones || '', datos.operador || 'TEREX-01',
      matStr
    ]);

    sheetMov.appendRow([
      'MOV-ING-' + now.getTime(), 'INGRESO', cleanCode, calle, fila,
      '', nivelAsignado, now, datos.operador || 'TEREX-01',
      datos.observaciones || 'Ingreso registrado en cabina Terex'
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCont = ss.getSheetByName(NOMBRES_HOJAS.CONTENEDORES);
    const sheetMov = ss.getSheetByName(NOMBRES_HOJAS.MOVIMIENTOS);

    const cleanCode = String(codigoISO).trim().toUpperCase();
    const lastRow = sheetCont.getLastRow();
    if (lastRow <= 1) throw new Error('No hay contenedores registrados.');

    const data = sheetCont.getRange(2, 1, lastRow - 1, 12).getValues();
    let targetIndex = -1;
    let targetContainer = null;

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanCode && String(data[i][7]) === 'DEPOSITADO') {
        targetIndex = i;
        targetContainer = {
          rowNumber: i + 2,
          calle: String(data[i][1]),
          fila: String(data[i][2]),
          nivel: Number(data[i][3])
        };
        break;
      }
    }

    if (!targetContainer) throw new Error('Contenedor ' + cleanCode + ' no encontrado activo.');

    const now = new Date();
    sheetCont.getRange(targetContainer.rowNumber, 8).setValue('RETIRADO');
    sheetCont.getRange(targetContainer.rowNumber, 10).setValue(now);

    sheetMov.appendRow([
      'MOV-RET-' + now.getTime(), 'RETIRO', cleanCode,
      targetContainer.calle, targetContainer.fila,
      targetContainer.nivel, '', now, operador || 'TEREX-01',
      motivo || 'Retiro para despacho'
    ]);

    // Reacomodamiento por gravedad
    for (let i = 0; i < data.length; i++) {
      if (i === targetIndex) continue;
      const cCalle = String(data[i][1]);
      const cFila = String(data[i][2]);
      const cEstado = String(data[i][7]);
      const cNivel = Number(data[i][3]);
      const cCodigo = String(data[i][0]).trim().toUpperCase();

      if (cEstado === 'DEPOSITADO' && cCalle === targetContainer.calle && cFila === targetContainer.fila && cNivel > targetContainer.nivel) {
        const nuevoNivel = cNivel - 1;
        sheetCont.getRange(i + 2, 4).setValue(nuevoNivel);
        sheetMov.appendRow([
          'MOV-REA-' + now.getTime() + '-' + (i + 1), 'REACOMODAMIENTO',
          cCodigo, cCalle, cFila, cNivel, nuevoNivel, now,
          operador || 'TEREX-01', 'Descenso por gravedad tras retiro de ' + cleanCode
        ]);
      }
    }

    SpreadsheetApp.flush();
    return { success: true, codigoISO: cleanCode };
  } finally {
    lock.releaseLock();
  }
}`;

  const currentContent = activeFile === 'Code.gs' ? codeGsContent : `<!-- Ver archivo completo /gas/index.html en la raíz del proyecto -->
<!-- Contiene interfaz industrial táctil lista para pegar en Apps Script -->`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151e27] border-2 border-[#233140] w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0f1722] px-5 py-4 border-b border-[#233140] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide text-lg font-mono">
                ARCHIVOS GOOGLE APPS SCRIPT
              </h3>
              <p className="text-xs text-slate-400">
                Listos para vincular a Google Sheets (sin tocar pestañas existentes como CONTROLES)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Security / Isolation notice */}
        <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-300 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>AISLAMIENTO ESTRICTO:</strong> Este código crea y opera únicamente las hojas{' '}
            <code className="text-white bg-black/40 px-1 rounded">CONTENEDORES</code>,{' '}
            <code className="text-white bg-black/40 px-1 rounded">MOVIMIENTOS</code> y{' '}
            <code className="text-white bg-black/40 px-1 rounded">CONFIG_PLAYA</code>. No modifica ninguna otra pestaña.
          </span>
        </div>

        {/* File selector tabs */}
        <div className="bg-[#0b1117] px-4 pt-2 border-b border-[#233140] flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFile('Code.gs')}
              className={`px-4 py-2 font-mono text-xs font-bold rounded-t-lg transition-all ${
                activeFile === 'Code.gs'
                  ? 'bg-[#151e27] text-teal-300 border-t-2 border-teal-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📄 Code.gs (Backend & LockService)
            </button>
            <button
              onClick={() => setActiveFile('index.html')}
              className={`px-4 py-2 font-mono text-xs font-bold rounded-t-lg transition-all ${
                activeFile === 'index.html'
                  ? 'bg-[#151e27] text-teal-300 border-t-2 border-teal-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 index.html (Frontend Táctil)
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-teal-500 hover:bg-teal-400 text-black text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '¡Copiado!' : 'Copiar Código'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-200 text-xs font-mono rounded flex items-center gap-1.5 transition-all border border-[#233140]"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar {activeFile}
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div className="p-4 flex-1 overflow-auto bg-[#0b1117]">
          <pre className="font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
            {currentContent}
          </pre>
        </div>

        {/* Footer instructions */}
        <div className="bg-[#0f1722] p-3 border-t border-[#233140] text-xs text-slate-400 font-mono flex items-center justify-between">
          <span>Ubicación en workspace: <code className="text-teal-400">/gas/{activeFile}</code></span>
          <span className="text-[11px] text-slate-500">Google Sheets ➔ Extensiones ➔ Apps Script</span>
        </div>
      </div>
    </div>
  );
};
