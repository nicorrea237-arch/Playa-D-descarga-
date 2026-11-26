import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Map as MapIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  CheckCircle,
  AlertCircle,
  X,
  FileCode
} from 'lucide-react';

import { Container, MovementRecord, PlayaConfig, MaterialItem } from './types/container';
import { StorageService } from './services/storageService';
import { GasSyncService, GasConnectionStatus } from './services/gasSyncService';
import { ErrorBoundary } from './components/ErrorBoundary';
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

const THEME_STORAGE_KEY = 'la_emilia_playa_d_theme_v1';

function PlayaDApp() {
  const [activeTab, setActiveTab] = useState<'operacion' | 'mapa' | 'buscador' | 'historial'>('operacion');
  const [containers, setContainers] = useState<Container[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [config, setConfig] = useState<PlayaConfig>(StorageService.getConfig());

  // Google Apps Script sync states
  const [gasUrl, setGasUrl] = useState<string>(() => GasSyncService.getGasUrl());
  const [gasStatus, setGasStatus] = useState<GasConnectionStatus>('syncing');
  const [gasStatusMessage, setGasStatusMessage] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore storage access issues
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage access issues
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

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

  const refreshStateFromLocal = useCallback(() => {
    const state = StorageService.getPlayaState();
    setContainers(state.containers);
    setMovements(state.movements);
    setConfig(state.config);
  }, []);

  const applyRemoteState = useCallback(
    (remoteState: { containers: Container[]; movements: MovementRecord[]; config?: Partial<PlayaConfig> }) => {
      const synced = StorageService.replaceState(
        remoteState.containers,
        remoteState.movements,
        remoteState.config
      );
      setContainers(synced.containers);
      setMovements(synced.movements);
      setConfig(synced.config);
    },
    []
  );

  // Sync full state from Google Apps Script
  const syncFromGas = useCallback(
    async (opts?: { showSuccessToast?: boolean; showFailureToast?: boolean; customUrl?: string }) => {
      setIsSyncing(true);
      setGasStatus('syncing');
      const res = await GasSyncService.fetchEstado(opts?.customUrl);
      setIsSyncing(false);

      if (res.ok && res.state) {
        applyRemoteState(res.state);
        setGasStatus('connected');
        setGasStatusMessage('Sincronizado correctamente con Google Sheets.');
        if (opts?.showSuccessToast) {
          addToast(
            'success',
            'GOOGLE SHEETS SINCRONIZADO',
            `${res.state.containers.filter((c) => c.estado === 'DEPOSITADO').length} contenedores activos en Playa D.`
          );
        }
        return true;
      }

      setGasStatus(res.status);
      setGasStatusMessage(res.errorMessage || 'No se pudo conectar con Google Sheets.');
      if (opts?.showFailureToast) {
        addToast('warning', 'Sin conexión directa con Sheets', res.errorMessage);
      }
      return false;
    },
    [addToast, applyRemoteState]
  );

  useEffect(() => {
    refreshStateFromLocal();
    void syncFromGas({ showSuccessToast: false, showFailureToast: false });
  }, [refreshStateFromLocal, syncFromGas]);

  const activeContainers = containers.filter((c) => c.estado === 'DEPOSITADO');
  const totalOccupied = activeContainers.length;
  const maxCapacity = config.calles.length * config.filasPorCalle * config.alturaMaxima; // 4 * 15 * 5 = 300

  // 1. Ingreso Handler (local optimistic + GAS Google Sheets sync)
  const handleIngreso = async (data: {
    codigoISO: string;
    calle: string;
    fila: string;
    tipo: string;
    naviera: string;
    tara?: number;
    observaciones?: string;
    operador: string;
    sectores?: string[];
    materiales?: MaterialItem[];
  }) => {
    try {
      const result = StorageService.registrarIngreso(data);
      refreshStateFromLocal();
      addToast(
        'success',
        `INGRESADO: ${result.container.codigoISO}`,
        `Ubicado en ${result.container.calle} / ${result.container.fila} - Nivel ${result.container.nivel}`
      );

      setIsSyncing(true);
      const gasRes = await GasSyncService.syncIngreso(data);
      setIsSyncing(false);

      if (gasRes.ok) {
        setGasStatus('connected');
        setGasStatusMessage('Último ingreso sincronizado con Google Sheets.');
        if (gasRes.state) {
          applyRemoteState(gasRes.state);
        }
        addToast('success', `SHEETS ACTUALIZADO: ${result.container.codigoISO}`, 'Ingreso guardado en CONTENEDORES y MOVIMIENTOS.');
      } else {
        setGasStatus(gasRes.status);
        setGasStatusMessage(gasRes.errorMessage || '');
        if (gasRes.status === 'error') {
          addToast('warning', 'Guardado local (error en Sheets)', gasRes.errorMessage);
        }
      }
    } catch (err: any) {
      addToast('error', 'Error en maniobra de ingreso', err.message);
    }
  };

  // 2. Retiro Handler with Gravity Restacking (local optimistic + GAS Google Sheets sync)
  const handleRetiro = async (codigoISO: string, motivo?: string) => {
    try {
      const result = StorageService.registrarRetiro(codigoISO, motivo);
      refreshStateFromLocal();

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

      setSelectedStackRow(null);

      setIsSyncing(true);
      const gasRes = await GasSyncService.syncRetiro(codigoISO, motivo);
      setIsSyncing(false);

      if (gasRes.ok) {
        setGasStatus('connected');
        setGasStatusMessage('Último retiro y reacomodamiento sincronizados con Sheets.');
        if (gasRes.state) {
          applyRemoteState(gasRes.state);
        }
        addToast('success', `SHEETS ACTUALIZADO: ${result.retirado.codigoISO}`, 'Baja y reacomodamientos registrados en Google Sheets.');
      } else {
        setGasStatus(gasRes.status);
        setGasStatusMessage(gasRes.errorMessage || '');
        if (gasRes.status === 'error') {
          addToast('warning', 'Retiro local (error en Sheets)', gasRes.errorMessage);
        }
      }
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
  const handleResetDemo = async () => {
    if (window.confirm('¿Desea restablecer los contenedores de muestra en Playa D?')) {
      const resetData = StorageService.resetToDefaultFleet();
      refreshStateFromLocal();
      addToast('success', 'Flota demo restablecida', 'Playa D inicializada con estibas de muestra.');

      setIsSyncing(true);
      const gasRes = await GasSyncService.syncResetDemo(resetData.containers, resetData.movements);
      setIsSyncing(false);

      if (gasRes.ok) {
        setGasStatus('connected');
        setGasStatusMessage('Flota de muestra sincronizada en Google Sheets.');
        if (gasRes.state) applyRemoteState(gasRes.state);
      } else {
        setGasStatus(gasRes.status);
        setGasStatusMessage(gasRes.errorMessage || '');
      }
    }
  };

  // 5. Select for operation from Search
  const handleSelectForOperation = (code: string) => {
    setPrefilledCode(code);
    setActiveTab('operacion');
  };

  // 6. Clear History
  const handleClearHistory = async () => {
    if (window.confirm('¿Confirma borrar el historial de auditoría?')) {
      StorageService.clearHistory();
      refreshStateFromLocal();
      addToast('warning', 'Historial limpiado');

      setIsSyncing(true);
      const gasRes = await GasSyncService.syncClearHistory();
      setIsSyncing(false);

      if (gasRes.ok) {
        setGasStatus('connected');
        setGasStatusMessage('Historial vaciado en Google Sheets.');
        if (gasRes.state) applyRemoteState(gasRes.state);
      } else {
        setGasStatus(gasRes.status);
        setGasStatusMessage(gasRes.errorMessage || '');
      }
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

  // 8. Save & test GAS URL from modal
  const handleSaveAndTestGasUrl = async (newUrl: string) => {
    const saved = GasSyncService.setGasUrl(newUrl);
    setGasUrl(saved);
    await syncFromGas({ showSuccessToast: true, showFailureToast: true, customUrl: saved });
  };

  const handleResetDefaultGasUrl = () => {
    const defaultUrl = GasSyncService.resetGasUrl();
    setGasUrl(defaultUrl);
    void syncFromGas({ showSuccessToast: true, showFailureToast: true, customUrl: defaultUrl });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1117] text-slate-900 dark:text-[#f1f5f9] flex flex-col font-sans selection:bg-teal-500 selection:text-black transition-colors">
      {/* INDUSTRIAL HEADER */}
      <Header
        totalOccupied={totalOccupied}
        maxCapacity={maxCapacity}
        theme={theme}
        gasStatus={gasStatus}
        gasStatusMessage={gasStatusMessage}
        isSyncing={isSyncing}
        onSyncNow={() => void syncFromGas({ showSuccessToast: true, showFailureToast: true })}
        onToggleTheme={toggleTheme}
        onOpenGasModal={() => setIsGasModalOpen(true)}
        onResetDemo={() => void handleResetDemo()}
      />

      {/* 4 MAIN TABS NAVIGATION (Touch min 52px high) */}
      <nav className="bg-white dark:bg-[#090e13] border-b-2 border-slate-200 dark:border-[#233140] grid grid-cols-2 md:grid-cols-4 select-none transition-colors">
        <button
          onClick={() => setActiveTab('operacion')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all whitespace-nowrap ${
            activeTab === 'operacion'
              ? 'border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <Truck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>OPERACIÓN CABINA</span>
        </button>

        <button
          onClick={() => setActiveTab('mapa')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all whitespace-nowrap ${
            activeTab === 'mapa'
              ? 'border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <MapIcon className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>MAPA PLAYA D</span>
        </button>

        <button
          onClick={() => setActiveTab('buscador')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all whitespace-nowrap ${
            activeTab === 'buscador'
              ? 'border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <SearchIcon className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>BUSCADOR</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`min-h-[54px] md:min-h-[58px] px-3 font-mono font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 border-b-4 transition-all whitespace-nowrap ${
            activeTab === 'historial'
              ? 'border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <HistoryIcon className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>HISTORIAL</span>
        </button>
      </nav>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 p-3 sm:p-5 md:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'operacion' && (
          <TerexOperationTab
            config={config}
            activeContainers={activeContainers}
            onIngreso={(data) => void handleIngreso(data)}
            onRetiro={(iso, motivo) => void handleRetiro(iso, motivo)}
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
            onWithdraw={(iso) => void handleRetiro(iso)}
            onSelectForOperation={handleSelectForOperation}
            onLocateOnMap={handleLocateOnMap}
          />
        )}

        {activeTab === 'historial' && (
          <HistoryTab
            movements={movements}
            onClearHistory={() => void handleClearHistory()}
          />
        )}
      </main>

      {/* FOOTER BAR */}
      <footer className="bg-white dark:bg-[#0f1722] border-t border-slate-200 dark:border-[#233140] px-4 py-2.5 text-xs font-mono text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-slate-800 dark:text-teal-400 font-semibold">
            LA EMILIA · PLAYA D
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
          <span className="hidden sm:inline">
            {theme === 'dark' ? 'MODO NOCTURNO ACTIVO' : 'MODO DIURNO ACTIVO'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGasModalOpen(true)}
            className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 underline flex items-center gap-1"
          >
            <FileCode className="w-3.5 h-3.5" />
            Conexión Sheets &amp; Code.gs
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>TERMINAL PLAYA D</span>
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
          onWithdraw={(iso) => void handleRetiro(iso)}
          highlightedCode={highlightedContainerCode}
        />
      )}

      {/* OCR SCANNER MODAL */}
      <OcrScannerModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onScanComplete={handleScanComplete}
      />

      {/* GOOGLE APPS SCRIPT CONNECTION & EXPORT MODAL */}
      <GasExportModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
        gasUrl={gasUrl}
        gasStatus={gasStatus}
        gasStatusMessage={gasStatusMessage}
        isSyncing={isSyncing}
        onSaveAndTestUrl={handleSaveAndTestGasUrl}
        onResetDefaultUrl={handleResetDefaultGasUrl}
      />

      {/* FLOATING TOAST SYSTEM */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border-2 pointer-events-auto flex items-start gap-3 backdrop-blur-md transition-all animate-in slide-in-from-right duration-200 ${
              toast.type === 'success'
                ? 'bg-white/95 dark:bg-[#151e27]/95 border-emerald-500 text-slate-900 dark:text-white'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 dark:bg-[#1e1713]/95 border-amber-500 text-slate-900 dark:text-white'
                : 'bg-red-50/95 dark:bg-[#1f1315]/95 border-red-500 text-slate-900 dark:text-white'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 font-mono">
              <h4 className="font-bold text-sm tracking-wide leading-tight">
                {toast.title}
              </h4>
              {toast.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PlayaDApp />
    </ErrorBoundary>
  );
}
