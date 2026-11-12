import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Map as MapIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  FileCode
} from 'lucide-react';

import { Container, MovementRecord, PlayaConfig } from './types/container';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { TerexOperationTab } from './components/TerexOperationTab';
import { PlayaMapTab } from './components/PlayaMapTab';
import { SearchTab } from './components/SearchTab';
import { HistoryTab } from './components/HistoryTab';
import { StackCrossSectionModal } from './components/StackCrossSectionModal';
import { OcrScannerModal } from './components/OcrScannerModal';
import { GasExportModal } from './components/GasExportModal';

interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  title: string;
  description?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'operacion' | 'mapa' | 'buscador' | 'historial'>('operacion');
  const [containers, setContainers] = useState<Container[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [config, setConfig] = useState<PlayaConfig>(StorageService.getConfig());

  // Modal states
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [selectedStackRow, setSelectedStackRow] = useState<{ calle: string; fila: string } | null>(null);
  const [highlightedContainerCode, setHighlightedContainerCode] = useState<string | null>(null);

  // Pre-filled code when navigating from search or OCR
  const [prefilledCode, setPrefilledCode] = useState<string>('');

  // Toast feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'warning' | 'error', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const refreshState = useCallback(() => {
    const state = StorageService.getPlayaState();
    setContainers(state.containers);
    setMovements(state.movements);
    setConfig(state.config);
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const activeContainers = containers.filter((c) => c.estado === 'DEPOSITADO');
  const totalOccupied = activeContainers.length;
  const maxCapacity = config.calles.length * config.filasPorCalle * config.alturaMaxima; // 4 * 15 * 5 = 300

  // 1. Ingreso Handler
  const handleIngreso = (data: {
    codigoISO: string;
    calle: string;
    fila: string;
    tipo: string;
    naviera: string;
    tara?: number;
    observaciones?: string;
    operador: string;
    materiales?: import('./types/container').MaterialItem[];
  }) => {
    try {
      const result = StorageService.registrarIngreso(data);
      refreshState();
      addToast(
        'success',
        `INGRESADO: ${result.container.codigoISO}`,
        `Ubicado en ${result.container.calle} / ${result.container.fila} - Nivel ${result.container.nivel}`
      );
    } catch (err: any) {
      addToast('error', 'Error en maniobra de ingreso', err.message);
    }
  };

  // 2. Retiro Handler with Gravity Restacking
  const handleRetiro = (codigoISO: string, motivo?: string) => {
    try {
      const result = StorageService.registrarRetiro(codigoISO, motivo);
      refreshState();

      const reacomodadosCount = result.reacomodados.length;
      if (reacomodadosCount > 0) {
        addToast(
          'warning',
          `RETIRO Y REACOMODAMIENTO: ${result.retirado.codigoISO}`,
          `Retirado de Nivel ${result.retirado.nivel}. Se reacomodaron ${reacomodadosCount} contenedor(es) superiores por gravedad.`
        );
      } else {
        addToast(
          'success',
          `RETIRADO CON ÉXITO: ${result.retirado.codigoISO}`,
          `Retirado de ${result.retirado.calle} / ${result.retirado.fila} (Nivel ${result.retirado.nivel})`
        );
      }

      // Close modal if open
      setSelectedStackRow(null);
    } catch (err: any) {
      addToast('error', 'Error en retiro de contenedor', err.message);
    }
  };

  // 3. OCR Scan Handler
  const handleScanComplete = (code: string) => {
    setPrefilledCode(code);
    setActiveTab('operacion');
    addToast('success', `OCR DETECTADO: ${code}`, 'Código cargado en la terminal de cabina');
  };

  // 4. Reset Demo
  const handleResetDemo = () => {
    if (window.confirm('¿Desea restablecer los contenedores de muestra en Playa D?')) {
      StorageService.resetToDefaultFleet();
      refreshState();
      addToast('success', 'Flota demo restablecida', 'Playa D inicializada con estibas de muestra.');
    }
  };

  // 5. Select for operation from Search
  const handleSelectForOperation = (code: string) => {
    setPrefilledCode(code);
    setActiveTab('operacion');
  };

  // 6. Clear History
  const handleClearHistory = () => {
    if (window.confirm('¿Confirma borrar el historial de auditoría local?')) {
      localStorage.setItem('terex_playa_d_movimientos_v1', JSON.stringify([]));
      refreshState();
      addToast('warning', 'Historial limpiado');
    }
  };

  // 7. Locate Container on Map from Search
  const handleLocateOnMap = (calle: string, fila: string, codigoISO: string) => {
    setSelectedStackRow({ calle, fila });
    setHighlightedContainerCode(codigoISO);
    setActiveTab('mapa');
    addToast(
      'warning',
      `MATERIAL LOCALIZADO: ${codigoISO}`,
      `Estibado en Calle ${calle} / Fila ${fila}. Resaltado en la pila vertical.`
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1117] text-[#f1f5f9] flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* INDUSTRIAL HEADER */}
      <Header
        totalOccupied={totalOccupied}
        maxCapacity={maxCapacity}
        onOpenGasModal={() => setIsGasModalOpen(true)}
        onResetDemo={handleResetDemo}
      />

      {/* 4 MAIN TABS NAVIGATION (Touch min 52px high) */}
      <nav className="bg-[#090e13] border-b-2 border-[#233140] grid grid-cols-2 md:grid-cols-4 select-none">
        <button
          onClick={() => setActiveTab('operacion')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all ${
            activeTab === 'operacion'
              ? 'border-teal-400 text-teal-300 bg-teal-500/10 shadow-[inset_0_-2px_10px_rgba(20,184,166,0.15)]'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Truck className="w-5 h-5 text-teal-400" />
          <span>OPERACIÓN TEREX</span>
        </button>

        <button
          onClick={() => setActiveTab('mapa')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all ${
            activeTab === 'mapa'
              ? 'border-teal-400 text-teal-300 bg-teal-500/10 shadow-[inset_0_-2px_10px_rgba(20,184,166,0.15)]'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <MapIcon className="w-5 h-5 text-teal-400" />
          <span>MAPA PLAYA D</span>
        </button>

        <button
          onClick={() => setActiveTab('buscador')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all ${
            activeTab === 'buscador'
              ? 'border-teal-400 text-teal-300 bg-teal-500/10 shadow-[inset_0_-2px_10px_rgba(20,184,166,0.15)]'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <SearchIcon className="w-5 h-5 text-teal-400" />
          <span>BUSCADOR</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all ${
            activeTab === 'historial'
              ? 'border-teal-400 text-teal-300 bg-teal-500/10 shadow-[inset_0_-2px_10px_rgba(20,184,166,0.15)]'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <HistoryIcon className="w-5 h-5 text-teal-400" />
          <span>HISTORIAL</span>
        </button>
      </nav>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 p-3 sm:p-5 md:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'operacion' && (
          <TerexOperationTab
            config={config}
            activeContainers={activeContainers}
            onIngreso={handleIngreso}
            onRetiro={handleRetiro}
            onOpenOcr={() => setIsOcrOpen(true)}
            onNavigateToMap={() => setActiveTab('mapa')}
            initialCode={prefilledCode}
          />
        )}

        {activeTab === 'mapa' && (
          <PlayaMapTab
            config={config}
            activeContainers={activeContainers}
            onOpenRowModal={(calle, fila) => {
              setSelectedStackRow({ calle, fila });
              setHighlightedContainerCode(null);
            }}
            highlightedRow={selectedStackRow}
          />
        )}

        {activeTab === 'buscador' && (
          <SearchTab
            containers={containers}
            onOpenRowModal={(calle, fila) => {
              setSelectedStackRow({ calle, fila });
              setHighlightedContainerCode(null);
              setActiveTab('mapa');
            }}
            onWithdraw={handleRetiro}
            onSelectForOperation={handleSelectForOperation}
            onLocateOnMap={handleLocateOnMap}
          />
        )}

        {activeTab === 'historial' && (
          <HistoryTab
            movements={movements}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* FOOTER BAR WITH SYSTEM STATUS */}
      <footer className="bg-[#0f1722] border-t border-[#233140] px-4 py-2 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-teal-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            TEREX TFC 45H TELEMETRÍA ONLINE
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">ALTO CONTRASTE SOL / NOCHE</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGasModalOpen(true)}
            className="text-teal-400 hover:text-teal-300 underline flex items-center gap-1"
          >
            <FileCode className="w-3.5 h-3.5" />
            Exportar Code.gs & index.html
          </button>
          <span className="text-slate-600">|</span>
          <span>TERMINAL PLAYA D · VERSIÓN 2.4</span>
        </div>
      </footer>

      {/* STACK CROSS-SECTION MODAL (LEVEL 5 TO 1) */}
      {selectedStackRow && (
        <StackCrossSectionModal
          isOpen={!!selectedStackRow}
          onClose={() => {
            setSelectedStackRow(null);
            setHighlightedContainerCode(null);
          }}
          calle={selectedStackRow.calle}
          fila={selectedStackRow.fila}
          containers={containers}
          onWithdraw={handleRetiro}
          highlightedCode={highlightedContainerCode}
        />
      )}

      {/* OCR SCANNER MODAL */}
      <OcrScannerModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onScanComplete={handleScanComplete}
      />

      {/* GOOGLE APPS SCRIPT CODE VIEWER / EXPORT MODAL */}
      <GasExportModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
      />

      {/* FLOATING TOAST SYSTEM */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border-2 pointer-events-auto flex items-start gap-3 backdrop-blur-md transition-all animate-in slide-in-from-right duration-200 ${
              toast.type === 'success'
                ? 'bg-[#151e27]/95 border-emerald-500/70 text-white'
                : toast.type === 'warning'
                ? 'bg-[#1e1713]/95 border-amber-500/80 text-white'
                : 'bg-[#1f1315]/95 border-red-500/80 text-white'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 font-mono">
              <h4 className="font-bold text-sm tracking-wide leading-tight">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
