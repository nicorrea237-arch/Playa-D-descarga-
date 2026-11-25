import React, { useState, useEffect, useCallback } from 'react';
import {
  Map,
  Truck,
  Search,
  History,
  Settings,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogOut,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { Container, MovementRecord, PlayaConfig, MaterialItem } from './types/container';
import { TerexOperationTab } from './components/TerexOperationTab';
import { PlayaMapTab } from './components/PlayaMapTab';
import { SearchTab } from './components/SearchTab';
import { HistoryTab } from './components/HistoryTab';
import { ConfigTab } from './components/ConfigTab';
import { GasIntegrationModal } from './components/GasIntegrationModal';
import { OcrModal } from './components/OcrModal';

const STORAGE_KEY_CONTAINERS = 'terex_playa_d_containers_v1';
const STORAGE_KEY_MOVEMENTS = 'terex_playa_d_movements_v1';
const STORAGE_KEY_CONFIG = 'terex_playa_d_config_v1';
const STORAGE_KEY_USER = 'terex_playa_d_user_v1';

const DEFAULT_CONFIG: PlayaConfig = {
  calles: ['C-01', 'C-02', 'C-03', 'C-04'],
  filasPorCalle: 10,
  alturaMaxima: 5,
  maquinaId: 'TEREX-01',
  depositoNombre: 'PLAYA D - DESCARGA INDUSTRIAL',
};

const SEED_CONTAINERS: Container[] = [
  {
    codigoISO: 'MSKU8291034',
    calle: 'C-01',
    fila: 'F-01',
    nivel: 1,
    tipo: "40' HC",
    naviera: 'Maersk',
    sector: 'LOGISTICA DE ENTRADA',
    tara: 3820,
    estado: 'DEPOSITADO',
    fechaIngreso: new Date(Date.now() - 86400000 * 3).toISOString(),
    observaciones: 'Ingreso inicial sector importaciones',
    operador: 'op@laemilia.com.ar',
    materiales: [
      { id: 'seed-1', codigo: 'MOT-250', descripcion: 'Motores 250cc 4T Monocilíndricos', cantidad: 60, unidad: 'PALLETS' },
      { id: 'seed-2', codigo: 'CHA-150', descripcion: 'Chasis Tubulares de Acero', cantidad: 90, unidad: 'BULTOS' }
    ]
  },
  {
    codigoISO: 'MRKU4928172',
    calle: 'C-01',
    fila: 'F-01',
    nivel: 2,
    tipo: "40' HC",
    naviera: 'Maersk',
    sector: 'PRODUCCION',
    tara: 3790,
    estado: 'DEPOSITADO',
    fechaIngreso: new Date(Date.now() - 86400000 * 2).toISOString(),
    observaciones: 'Estibado sobre MSKU8291034',
    operador: 'op@laemilia.com.ar',
    materiales: [
      { id: 'seed-3', codigo: 'BAT-LIT', descripcion: 'Baterías de Litio 48V 26Ah', cantidad: 200, unidad: 'BULTOS' },
      { id: 'seed-4', codigo: 'FAR-LED', descripcion: 'Ópticas Delanteras LED', cantidad: 450, unidad: 'CAJAS' }
    ]
  },
  {
    codigoISO: 'CMAU1029384',
    calle: 'C-01',
    fila: 'F-01',
    nivel: 3,
    tipo: "40' Reefer",
    naviera: 'CMA CGM',
    sector: 'RETENIDAS',
    tara: 4120,
    estado: 'DEPOSITADO',
    fechaIngreso: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    observaciones: 'Aguarda liberación de calidad',
    operador: 'op@laemilia.com.ar',
    materiales: [
      { id: 'seed-5', codigo: 'LUB-20W', descripcion: 'Aceite Lubricante 4T 20W50', cantidad: 36, unidad: 'TAMBORES' }
    ]
  },
  {
    codigoISO: 'HLCU7748291',
    calle: 'C-02',
    fila: 'F-03',
    nivel: 1,
    tipo: "20' DC",
    naviera: 'Hapag-Lloyd',
    sector: 'MANTENIMIENTO',
    tara: 2240,
    estado: 'DEPOSITADO',
    fechaIngreso: new Date(Date.now() - 86400000 * 1).toISOString(),
    observaciones: 'Repuestos y herramientas industriales',
    operador: 'op@laemilia.com.ar',
    materiales: [
      { id: 'seed-6', codigo: 'NEU-17', descripcion: 'Neumáticos Tubeless 110/80-17', cantidad: 350, unidad: 'UNID' }
    ]
  },
  {
    codigoISO: 'COSU6655443',
    calle: 'C-03',
    fila: 'F-05',
    nivel: 1,
    tipo: "40' HC",
    naviera: 'Cosco',
    sector: 'LOGISTICA DE SALIDA',
    tara: 3850,
    estado: 'DEPOSITADO',
    fechaIngreso: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    observaciones: 'Listo para despacho',
    operador: 'op@laemilia.com.ar',
    materiales: [
      { id: 'seed-7', codigo: 'CHA-150', descripcion: 'Chasis Tubulares de Acero', cantidad: 120, unidad: 'BULTOS' }
    ]
  }
];

const SEED_MOVEMENTS: MovementRecord[] = SEED_CONTAINERS.map((c, idx) => ({
  id: `SEED-MOV-${idx + 1}`,
  tipo: 'INGRESO',
  codigoISO: c.codigoISO,
  calle: c.calle,
  fila: c.fila,
  nivelOrigen: null,
  nivelDestino: c.nivel,
  timestamp: c.fechaIngreso,
  operador: c.operador,
  motivo: 'Carga inicial operativa Playa D'
}));

type ActiveTab = 'terex' | 'map' | 'search' | 'history' | 'config';

export function App() {
  const [authorizedUser, setAuthorizedUser] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || '';
    } catch {
      return '';
    }
  });
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isVerifyingUser, setIsVerifyingUser] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('terex');
  const [config, setConfig] = useState<PlayaConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [containers, setContainers] = useState<Container[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTAINERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_CONTAINERS;
  });

  const [movements, setMovements] = useState<MovementRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return SEED_MOVEMENTS;
  });

  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem('terex_gas_url') || '';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('terex_theme') as 'dark' | 'light') || 'dark';
  });

  const [showGasModal, setShowGasModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrScannedCode, setOcrScannedCode] = useState<string>('');
  const [selectedContainerForMap, setSelectedContainerForMap] = useState<Container | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONTAINERS, JSON.stringify(containers));
    } catch (e) {
      console.error('Failed to save containers to localStorage:', e);
    }
  }, [containers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error('Failed to save movements to localStorage:', e);
    }
  }, [movements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save config to localStorage:', e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('terex_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
    } catch {}
  }, [theme]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const normalizedEmail = loginEmail.trim().toLowerCase();

    const emailRegex = /^[a-z0-9._%+-]+@laemilia\.com\.ar$/;
    if (!emailRegex.test(normalizedEmail)) {
      setLoginError('Acceso restringido: debe ingresar un correo válido de @laemilia.com.ar');
      return;
    }

    setIsVerifyingUser(true);
    try {
      if (gasUrl) {
        const separator = gasUrl.includes('?') ? '&' : '?';
        const response = await fetch(
          `${gasUrl}${separator}action=verifyUser&email=${encodeURIComponent(normalizedEmail)}`
        );
        const result = await response.json();
        if (result && result.authorized === false) {
          setLoginError(result.error || 'Usuario @laemilia.com.ar no habilitado en la planilla.');
          setIsVerifyingUser(false);
          return;
        }
      }

      localStorage.setItem(STORAGE_KEY_USER, normalizedEmail);
      setAuthorizedUser(normalizedEmail);
      showToast(`Bienvenido ${normalizedEmail}`, 'success');
    } catch {
      // Si el GAS no responde o aún no tiene verifyUser configurado, validamos el dominio @laemilia.com.ar
      localStorage.setItem(STORAGE_KEY_USER, normalizedEmail);
      setAuthorizedUser(normalizedEmail);
      showToast(`Acceso verificado para ${normalizedEmail}`, 'success');
    } finally {
      setIsVerifyingUser(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    setAuthorizedUser('');
    setLoginEmail('');
  };

  const syncWithGas = async (actionPayload?: Record<string, unknown>, targetUrl?: string) => {
    const urlToUse = targetUrl || gasUrl;
    if (!urlToUse) return;
    setIsSyncing(true);
    try {
      const response = await fetch(urlToUse, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          ...(actionPayload || { action: 'syncAll' }),
          operatorEmail: authorizedUser,
        }),
      });
      const result = await response.json();
      if (result.status === 'ok') {
        if (Array.isArray(result.containers) && !actionPayload) {
          setContainers(result.containers);
        }
        if (Array.isArray(result.movements) && !actionPayload) {
          setMovements(result.movements);
        }
        if (actionPayload) {
          showToast('Sincronizado con Google Sheets / Apps Script', 'success');
        }
      } else if (result.error) {
        showToast(`GAS Error: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('GAS sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleIngreso = (data: {
    codigoISO: string;
    calle: string;
    fila: string;
    tipo: string;
    naviera: string;
    sector?: string;
    tara?: number;
    observaciones?: string;
    operador: string;
    materiales?: MaterialItem[];
  }) => {
    const cleanIso = data.codigoISO.trim().toUpperCase();

    const existingActive = containers.find(
      (c) => c.codigoISO.toUpperCase() === cleanIso && c.estado === 'DEPOSITADO'
    );
    if (existingActive) {
      showToast(`El contenedor ${cleanIso} ya está DEPOSITADO en ${existingActive.calle} / ${existingActive.fila} (Nivel ${existingActive.nivel})`, 'error');
      return;
    }

    const rowStack = containers.filter(
      (c) => c.calle === data.calle && c.fila === data.fila && c.estado === 'DEPOSITADO'
    );
    const nextLevel = rowStack.length + 1;

    if (nextLevel > config.alturaMaxima) {
      showToast(`La fila ${data.fila} en calle ${data.calle} está llena (máximo ${config.alturaMaxima} niveles)`, 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const newContainer: Container = {
      codigoISO: cleanIso,
      calle: data.calle,
      fila: data.fila,
      nivel: nextLevel,
      tipo: data.tipo,
      naviera: data.naviera,
      sector: data.sector || 'LOGISTICA DE ENTRADA',
      tara: data.tara,
      estado: 'DEPOSITADO',
      fechaIngreso: nowIso,
      observaciones: data.observaciones,
      operador: data.operador || authorizedUser || config.maquinaId,
      materiales: data.materiales || [],
    };

    const newMovement: MovementRecord = {
      id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'INGRESO',
      codigoISO: cleanIso,
      calle: data.calle,
      fila: data.fila,
      nivelOrigen: null,
      nivelDestino: nextLevel,
      timestamp: nowIso,
      operador: newContainer.operador,
      motivo: data.sector ? `Sector: ${data.sector}` : data.observaciones || 'Ingreso operativo a Playa D',
    };

    setContainers((prev) => [...prev, newContainer]);
    setMovements((prev) => [newMovement, ...prev]);

    showToast(
      `INGRESO: ${cleanIso} en ${data.calle} · ${data.fila} · NIVEL ${nextLevel} (${newContainer.sector})`,
      'success'
    );

    syncWithGas({
      action: 'ingreso',
      container: newContainer,
      movement: newMovement,
    });
  };

  const handleRetiro = (codigoISO: string, motivo?: string) => {
    const cleanIso = codigoISO.trim().toUpperCase();
    const target = containers.find(
      (c) => c.codigoISO.toUpperCase() === cleanIso && c.estado === 'DEPOSITADO'
    );

    if (!target) {
      showToast(`Contenedor ${cleanIso} no encontrado como activo en Playa D`, 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const superiorContainers = containers.filter(
      (c) =>
        c.estado === 'DEPOSITADO' &&
        c.calle === target.calle &&
        c.fila === target.fila &&
        c.nivel > target.nivel
    );

    const dropMovements: MovementRecord[] = superiorContainers.map((sup) => ({
      id: `MOV-DROP-${Date.now()}-${sup.codigoISO}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'REACOMODAMIENTO',
      codigoISO: sup.codigoISO,
      calle: sup.calle,
      fila: sup.fila,
      nivelOrigen: sup.nivel,
      nivelDestino: sup.nivel - 1,
      timestamp: nowIso,
      operador: authorizedUser || config.maquinaId,
      motivo: `Reacomodamiento por gravedad tras retiro de ${cleanIso}`,
    }));

    const retiroMovement: MovementRecord = {
      id: `MOV-RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'RETIRO',
      codigoISO: cleanIso,
      calle: target.calle,
      fila: target.fila,
      nivelOrigen: target.nivel,
      nivelDestino: null,
      timestamp: nowIso,
      operador: authorizedUser || config.maquinaId,
      motivo: motivo || 'Retiro operativo desde Playa D',
    };

    setContainers((prev) =>
      prev.map((c) => {
        if (c.codigoISO.toUpperCase() === cleanIso && c.estado === 'DEPOSITADO') {
          return {
            ...c,
            estado: 'RETIRADO',
            fechaRetiro: nowIso,
          };
        }
        if (
          c.estado === 'DEPOSITADO' &&
          c.calle === target.calle &&
          c.fila === target.fila &&
          c.nivel > target.nivel
        ) {
          return {
            ...c,
            nivel: c.nivel - 1,
          };
        }
        return c;
      })
    );

    setMovements((prev) => [retiroMovement, ...dropMovements, ...prev]);

    const dropText =
      superiorContainers.length > 0
        ? ` · ${superiorContainers.length} cont. reacomodado(s) 1 nivel abajo`
        : '';
    showToast(`RETIRO: ${cleanIso} retirado de ${target.calle} · ${target.fila} (Nivel ${target.nivel})${dropText}`, 'info');

    syncWithGas({
      action: 'retiro',
      codigoISO: cleanIso,
      fechaRetiro: nowIso,
      movement: retiroMovement,
      dropMovements,
    });
  };

  if (!authorizedUser) {
    return (
      <div className="min-h-screen bg-[#0b1117] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#151e27] border-2 border-[#233140] rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <img
              src="LaEmilia_Logosnuevos2023_Mesa de trabajo 1.jpg"
              alt="Logo La Emilia"
              className="h-14 w-auto object-contain rounded-lg bg-white/95 px-3 py-1.5"
            />
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-teal-300 bg-teal-950/60 border border-teal-500/40 px-3 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5" />
              ACCESO CORPORATIVO PLAYA D
            </div>
            <h1 className="font-mono font-bold text-xl text-white">
              INGRESO EXCLUSIVO @LAEMILIA.COM.AR
            </h1>
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              Ingrese su correo institucional de La Emilia para operar la grúa Terex, consultar sectores y registrar movimientos.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5 uppercase">
                CORREO CORPORATIVO LA EMILIA
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nombre.apellido@laemilia.com.ar"
                  className="w-full h-12 bg-[#0b1117] border-2 border-[#233140] focus:border-teal-400 rounded-xl pl-10 pr-4 text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-950/50 border border-red-500/50 rounded-xl p-3 text-xs font-mono text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingUser}
              className="w-full h-12 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              {isVerifyingUser ? 'VERIFICANDO ACCESO...' : 'INGRESAR A PLAYA D'}
            </button>
          </form>

          <div className="pt-2 border-t border-[#233140] text-[11px] font-mono text-slate-500 text-center">
            Dominio permitido: <span className="text-slate-300">@laemilia.com.ar</span>
          </div>
        </div>
      </div>
    );
  }

  const activeContainers = containers.filter((c) => c.estado === 'DEPOSITADO');

  return (
    <div className={`min-h-screen font-sans flex flex-col ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-[#0b1117] text-slate-100'}`}>
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border-2 font-mono text-xs md:text-sm font-bold flex items-center gap-2.5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-md ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-500/60'
              : toast.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-500/60'
              : 'bg-slate-900 text-teal-200 border-teal-500/60'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-[#151e27] border-b-2 border-[#233140] px-4 py-3 sticky top-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="LaEmilia_Logosnuevos2023_Mesa de trabajo 1.jpg"
              alt="Logo La Emilia"
              className="h-10 md:h-11 w-auto object-contain rounded-lg bg-white/95 px-2 py-1 shrink-0"
            />
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono font-bold text-base md:text-lg text-white tracking-wider">
                  TEREX · {config.depositoNombre}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40 font-bold">
                  {config.maquinaId}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <span>
                  CONTENEDORES ACTIVOS: <strong className="text-teal-400">{activeContainers.length}</strong>
                </span>
                <span>·</span>
                <span className="text-emerald-400 font-bold">{authorizedUser}</span>
                {gasUrl && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      GAS CONECTADO
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="h-9 px-3 rounded-lg bg-[#0f1722] hover:bg-[#1a2533] text-amber-300 border border-amber-500/30 font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Cambiar entre Modo Noche y Modo Sol"
            >
              <span>{theme === 'dark' ? 'MODO SOL' : 'MODO NOCHE'}</span>
            </button>

            {gasUrl && (
              <button
                type="button"
                onClick={() => syncWithGas()}
                disabled={isSyncing}
                className="h-9 px-3 rounded-lg bg-[#0f1722] hover:bg-[#1a2533] text-teal-300 border border-teal-500/30 font-mono text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Sincronizar con Google Apps Script"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">SYNC</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGasModal(true)}
              className={`h-9 px-3 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 border transition-all ${
                gasUrl
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                  : 'bg-[#0f1722] hover:bg-[#1a2533] text-slate-300 border-[#233140]'
              }`}
              title="Conectar Google Apps Script y Google Sheets"
            >
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span>GOOGLE APPS SCRIPT</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="h-9 px-2.5 rounded-lg bg-[#0f1722] hover:bg-red-950/50 text-slate-400 hover:text-red-300 border border-[#233140] font-mono text-xs font-bold flex items-center gap-1 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">SALIR</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="bg-[#0f1722] border-b border-[#233140] px-4 sticky top-[68px] z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('terex')}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'terex'
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#151e27]'
            }`}
          >
            <Truck className="w-4 h-4" />
            OPERACIÓN TEREX
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'map'
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#151e27]'
            }`}
          >
            MAPA PLAYA D
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/25 font-mono">
              {activeContainers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'search'
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#151e27]'
            }`}
          >
            <Search className="w-4 h-4" />
            BUSCADOR
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'history'
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#151e27]'
            }`}
          >
            <History className="w-4 h-4" />
            HISTORIAL
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/25 font-mono">
              {movements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs md:text-sm flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'config'
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-[#151e27]'
            }`}
          >
            <Settings className="w-4 h-4" />
            CONFIGURACIÓN
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6">
        {activeTab === 'terex' && (
          <TerexOperationTab
            config={config}
            activeContainers={activeContainers}
            onIngreso={handleIngreso}
            onRetiro={handleRetiro}
            onOpenOcr={() => setShowOcrModal(true)}
            onNavigateToMap={() => setActiveTab('map')}
            initialCode={ocrScannedCode}
            currentOperator={authorizedUser}
          />
        )}

        {activeTab === 'map' && (
          <PlayaMapTab
            config={config}
            activeContainers={activeContainers}
            onRetiro={handleRetiro}
            highlightedContainer={selectedContainerForMap}
            onClearHighlight={() => setSelectedContainerForMap(null)}
          />
        )}

        {activeTab === 'search' && (
          <SearchTab
            containers={containers}
            onSelectContainer={(c) => {
              setSelectedContainerForMap(c);
              setActiveTab('map');
            }}
            onQuickRetiro={(iso) => {
              setOcrScannedCode(iso);
              setActiveTab('terex');
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab movements={movements} containers={containers} />
        )}

        {activeTab === 'config' && (
          <ConfigTab
            config={config}
            onSaveConfig={(newConfig) => {
              setConfig(newConfig);
              showToast('Configuración de Playa D actualizada', 'success');
            }}
            onOpenGas={() => setShowGasModal(true)}
            onResetSeed={() => {
              setContainers(SEED_CONTAINERS);
              setMovements(SEED_MOVEMENTS);
              showToast('Datos de demostración restablecidos', 'info');
            }}
          />
        )}
      </main>

      {/* Modals */}
      {showGasModal && (
        <GasIntegrationModal
          gasUrl={gasUrl}
          onSaveUrl={(url) => {
            setGasUrl(url);
            localStorage.setItem('terex_gas_url', url);
            showToast('URL de Google Apps Script guardada', 'success');
          }}
          onClose={() => setShowGasModal(false)}
          containers={containers}
          movements={movements}
        />
      )}

      {showOcrModal && (
        <OcrModal
          onDetected={(code) => {
            setOcrScannedCode(code);
            setShowOcrModal(false);
            setActiveTab('terex');
            showToast(`Código ISO detectado por OCR: ${code}`, 'success');
          }}
          onClose={() => setShowOcrModal(false)}
        />
      )}
    </div>
  );
}
