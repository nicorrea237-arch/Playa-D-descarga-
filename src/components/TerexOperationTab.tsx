import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  Info,
  ShieldCheck,
  Delete,
  Keyboard,
  XCircle,
  Truck,
  Package,
  Plus,
  Trash2,
  Building2,
  Check
} from 'lucide-react';
import { Container, PlayaConfig, MaterialItem, CONTAINER_SECTORS } from '../types/container';
import { validateIso6346 } from '../utils/iso6346';

interface TerexOperationTabProps {
  config: PlayaConfig;
  activeContainers: Container[];
  onIngreso: (data: {
    codigoISO: string;
    calle: string;
    fila: string;
    tipo: string;
    naviera: string;
    tara?: number;
    observaciones?: string;
    operador: string;
    sectores?: string[];
    materiales?: import('../types/container').MaterialItem[];
  }) => void;
  onRetiro: (codigoISO: string, motivo?: string) => void;
  onOpenOcr: () => void;
  onNavigateToMap: () => void;
  initialCode?: string;
}

export const TerexOperationTab: React.FC<TerexOperationTabProps> = ({
  config,
  activeContainers,
  onIngreso,
  onRetiro,
  onOpenOcr,
  initialCode = '',
}) => {
  const [isoInput, setIsoInput] = useState<string>(initialCode);
  const [selectedCalle, setSelectedCalle] = useState<string>('C-01');
  const [selectedFila, setSelectedFila] = useState<string>('F-01');
  const [tipo, setTipo] = useState<string>("40' HC");
  const [naviera, setNaviera] = useState<string>('MSC');
  const [tara, setTara] = useState<string>('3800');
  const [observaciones, setObservaciones] = useState<string>('');
  const [operador] = useState<string>('TEREX-01 / Cabina');
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [selectedSectores, setSelectedSectores] = useState<string[]>([]);

  // Materials manifest state
  const [materiales, setMateriales] = useState<MaterialItem[]>([]);
  const [matDesc, setMatDesc] = useState<string>('');
  const [matCant, setMatCant] = useState<number>(50);
  const [matUnidad, setMatUnidad] = useState<string>('BULTOS');
  const [matCodigo, setMatCodigo] = useState<string>('');

  // Sync initial code if passed from OCR or external
  useEffect(() => {
    if (initialCode) {
      setIsoInput(initialCode.toUpperCase());
    }
  }, [initialCode]);

  const toggleSector = (sector: string) => {
    setSelectedSectores((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
    );
  };

  const handleAddMaterial = () => {
    if (!matDesc.trim()) return;
    const newItem: MaterialItem = {
      id: `MAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      codigo: matCodigo.trim() ? matCodigo.trim().toUpperCase() : undefined,
      descripcion: matDesc.trim(),
      cantidad: Number(matCant) > 0 ? Number(matCant) : 1,
      unidad: matUnidad,
    };
    setMateriales((prev) => [...prev, newItem]);
    setMatDesc('');
    setMatCodigo('');
  };

  const handleRemoveMaterial = (id: string) => {
    setMateriales((prev) => prev.filter((m) => m.id !== id));
  };

  const handleQuickTag = (tagDesc: string, defaultQty: number, defaultUnit: string, code?: string) => {
    const newItem: MaterialItem = {
      id: `MAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      codigo: code,
      descripcion: tagDesc,
      cantidad: defaultQty,
      unidad: defaultUnit,
    };
    setMateriales((prev) => [...prev, newItem]);
  };

  const cleanIso = isoInput.trim().toUpperCase();
  const validation = validateIso6346(cleanIso);

  // SMART DETECTION RULE: Check if container code already exists active in Playa D
  const detectedContainer = activeContainers.find(
    (c) => c.codigoISO.toUpperCase() === cleanIso && c.estado === 'DEPOSITADO'
  );

  const isRetiroMode = !!detectedContainer;

  // Calculate stack occupancy for current selected calle and fila
  const currentStack = activeContainers.filter(
    (c) => c.calle === selectedCalle && c.fila === selectedFila && c.estado === 'DEPOSITADO'
  );
  const currentHeight = currentStack.length;
  const isRowFull = currentHeight >= config.alturaMaxima;
  const assignedLevel = isRowFull ? null : currentHeight + 1;

  // Calculate if withdrawal would cause gravity shifts
  const superiorContainersCount = isRetiroMode
    ? activeContainers.filter(
        (c) =>
          c.calle === detectedContainer.calle &&
          c.fila === detectedContainer.fila &&
          c.estado === 'DEPOSITADO' &&
          c.nivel > detectedContainer.nivel
      ).length
    : 0;

  const handleInputChange = (val: string) => {
    setIsoInput(val.toUpperCase().slice(0, 11));
  };

  const handleVirtualKeyPress = (char: string) => {
    if (isoInput.length < 11) {
      setIsoInput((prev) => (prev + char).slice(0, 11));
    }
  };

  const handleVirtualBackspace = () => {
    setIsoInput((prev) => prev.slice(0, -1));
  };

  const handleVirtualClear = () => {
    setIsoInput('');
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanIso) return;

    if (isRetiroMode) {
      onRetiro(cleanIso, observaciones || 'Retiro operativo desde cabina');
      setIsoInput('');
      setObservaciones('');
    } else {
      if (isRowFull) {
        return;
      }
      onIngreso({
        codigoISO: cleanIso,
        calle: selectedCalle,
        fila: selectedFila,
        tipo,
        naviera,
        tara: tara ? parseInt(tara, 10) : undefined,
        observaciones,
        operador,
        sectores: selectedSectores,
        materiales,
      });
      setIsoInput('');
      setObservaciones('');
      setSelectedSectores([]);
      setMateriales([]);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Container Identification Card */}
      <div className="bg-white dark:bg-[#151e27] border-2 border-slate-200 dark:border-[#233140] rounded-xl p-4 md:p-6 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#233140] pb-3">
          <h2 className="font-mono font-bold text-base md:text-lg text-slate-900 dark:text-white tracking-wider">
            IDENTIFICACIÓN DE CONTENEDOR (CABINA)
          </h2>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-md font-mono font-bold uppercase tracking-wider ${
                isRetiroMode
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/50 animate-pulse'
                  : 'bg-teal-50 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/50'
              }`}
            >
              MODO: {isRetiroMode ? 'RETIRO AUTOMÁTICO (ENCONTRADO)' : 'INGRESO A PLAYA D'}
            </span>

            <button
              type="button"
              onClick={() => setShowKeypad(!showKeypad)}
              className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all whitespace-nowrap ${
                showKeypad
                  ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-black border-teal-500 dark:border-teal-400 font-bold'
                  : 'bg-slate-100 dark:bg-[#0f1722] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#233140] hover:border-slate-400 dark:hover:border-slate-500'
              }`}
              title="Abrir teclado táctil industrial para pantalla táctil"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">TECLADO CABINA</span>
            </button>
          </div>
        </div>

        {/* Big Touch ISO Input + OCR Trigger */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={isoInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="EJ: MSKU8291034"
              maxLength={11}
              className="w-full h-15 bg-slate-50 dark:bg-[#0b1117] border-2 border-slate-300 dark:border-[#233140] focus:border-teal-600 dark:focus:border-teal-400 rounded-xl px-4 text-2xl md:text-3xl font-mono font-bold tracking-widest text-slate-900 dark:text-white uppercase placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
            {isoInput && (
              <button
                type="button"
                onClick={handleVirtualClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white p-2"
                title="Limpiar código"
              >
                <XCircle className="w-6 h-6" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenOcr}
            className="h-15 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-[#0f1722] dark:hover:bg-[#1a2533] text-teal-800 dark:text-teal-300 border-2 border-teal-500/50 hover:border-teal-600 dark:hover:border-teal-400 rounded-xl font-mono font-bold text-sm md:text-base flex items-center justify-center gap-2.5 shadow-sm dark:shadow-lg dark:shadow-teal-500/10 active:scale-95 transition-all shrink-0 whitespace-nowrap"
          >
            <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            ESCANEAR OCR
          </button>
        </div>

        {/* Real-time ISO 6346 Mathematical Check Digit Banner */}
        <div className="mt-3">
          {cleanIso.length === 0 ? (
            <div className="bg-slate-50 dark:bg-[#0f1722] border border-slate-200 dark:border-[#233140] rounded-lg px-4 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Ingrese código ISO de 11 caracteres (4 letras prefijo + 6 dígitos correlativos + 1 dígito verificador).
              </span>
            </div>
          ) : validation.isValid ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/50 rounded-lg px-4 py-2.5 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>DÍGITO VERIFICADOR ISO 6346 VÁLIDO: [{validation.actualCheckDigit}]</span>
              </div>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-400/90 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap">
                NORMA OFICIAL OK
              </span>
            </div>
          ) : validation.actualCheckDigit !== null ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/50 rounded-lg px-4 py-2.5 text-xs font-mono text-amber-900 dark:text-amber-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  ADVERTENCIA ISO: Dígito esperado es [{validation.expectedCheckDigit}], ingresado [{validation.actualCheckDigit}].
                </span>
              </div>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/30 whitespace-nowrap">
                PERMITIDO CONTINUAR
              </span>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#0f1722] border border-slate-200 dark:border-[#233140] rounded-lg px-4 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{validation.message}</span>
            </div>
          )}
        </div>

        {/* Cabin Virtual Keypad for touch displays (10") */}
        {showKeypad && (
          <div className="mt-4 pt-4 bg-slate-50 dark:bg-[#0b1117] p-3 rounded-xl border border-slate-300 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2 px-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span>TECLADO TÁCTIL CABINA (TOUCH OPTIMIZADO)</span>
              <button
                type="button"
                onClick={() => setShowKeypad(false)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold"
              >
                Cerrar
              </button>
            </div>

            {/* Quick prefix shortcuts */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {['MSKU', 'MRKU', 'CMAU', 'HLCU', 'COSU', 'ONEY', 'SUDU', 'TGHU', 'ZIMU'].map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setIsoInput(pref)}
                  className="px-2.5 py-1.5 bg-white hover:bg-teal-600 hover:text-white dark:bg-[#1e293b] dark:hover:bg-teal-500 dark:hover:text-black rounded text-xs font-mono font-bold text-teal-700 dark:text-teal-300 border border-teal-500/40 dark:border-teal-500/30 transition-all"
                >
                  +{pref}
                </button>
              ))}
            </div>

            {/* Digit keypad */}
            <div className="grid grid-cols-4 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleVirtualKeyPress(digit)}
                  className="h-12 bg-white hover:bg-slate-100 active:bg-teal-600 active:text-white dark:bg-[#151e27] dark:hover:bg-[#202d3a] dark:active:bg-teal-500 dark:active:text-black text-slate-900 dark:text-white font-mono font-bold text-xl rounded-lg border border-slate-300 dark:border-[#233140] transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleVirtualBackspace}
                className="h-12 bg-red-50 hover:bg-red-100 dark:bg-[#1f2937] dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 font-mono font-bold rounded-lg border border-red-300 dark:border-red-500/30 flex items-center justify-center"
                title="Borrar carácter"
              >
                <Delete className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleVirtualClear}
                className="h-12 bg-slate-200 hover:bg-slate-300 dark:bg-[#1f2937] dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-[#233140]"
              >
                LIMPIAR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETECTED CONTAINER - AUTO-RETIRO MODE VIEW */}
      {isRetiroMode && detectedContainer ? (
        <div className="bg-white dark:bg-[#151e27] border-2 border-red-400 dark:border-red-500/60 rounded-xl p-5 md:p-6 shadow-md dark:shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400 font-mono font-bold text-lg mb-4">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            CONTENEDOR LOCALIZADO EN PLAYA D
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-[#0b1117] border border-slate-200 dark:border-[#233140] p-4 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase block mb-1">
                CALLE OPERATIVA
              </span>
              <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
                {detectedContainer.calle}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#0b1117] border border-slate-200 dark:border-[#233140] p-4 rounded-xl">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono uppercase block mb-1">
                FILA ASIGNADA
              </span>
              <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
                {detectedContainer.fila}
              </span>
            </div>

            <div className="bg-teal-50 dark:bg-[#0b1117] border border-teal-300 dark:border-teal-500/40 p-4 rounded-xl">
              <span className="text-xs text-teal-700 dark:text-teal-400 font-mono uppercase block mb-1">
                NIVEL DE ESTIBA
              </span>
              <span className="text-3xl font-mono font-bold text-teal-800 dark:text-teal-300">
                NIVEL {detectedContainer.nivel}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono block mt-1">
                {detectedContainer.nivel === 1 ? 'En piso' : `Sobre nivel ${detectedContainer.nivel - 1}`}
              </span>
            </div>
          </div>

          {/* Gravity Drop Warning */}
          {superiorContainersCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-500/60 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 shrink-0">
                <ArrowDown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-mono font-bold text-amber-900 dark:text-amber-300 text-sm">
                  REACOMODAMIENTO AUTOMÁTICO POR GRAVEDAD REQUERIDO
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-1">
                  Existen <strong className="text-slate-900 dark:text-white font-mono">{superiorContainersCount} contenedor(es)</strong> apoyados sobre este nivel en la fila {detectedContainer.fila}. Al confirmar el retiro, el sistema bajará automáticamente 1 nivel a cada uno y registrará la auditoría de maniobra.
                </p>
              </div>
            </div>
          )}

          {/* Sectores asignados (Retiro view) */}
          {detectedContainer.sectores && detectedContainer.sectores.length > 0 && (
            <div className="bg-slate-50 dark:bg-[#0b1117] border border-slate-200 dark:border-[#233140] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  SECTORES ASIGNADOS
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {detectedContainer.sectores.map((sec) => (
                  <span
                    key={sec}
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contenido / Materiales declarados */}
          {detectedContainer.materiales && detectedContainer.materiales.length > 0 && (
            <div className="bg-slate-50 dark:bg-[#0b1117] border border-slate-200 dark:border-[#233140] rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200 dark:border-[#233140]">
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  CONTENIDO REGISTRADO / MATERIALES DENTRO DEL CONTENEDOR
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {detectedContainer.materiales.length} ÍTEM(S) DECLARADOS
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detectedContainer.materiales.map((mat) => (
                  <div key={mat.id} className="bg-white dark:bg-[#151e27] border border-slate-200 dark:border-[#233140] p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">{mat.descripcion}</div>
                      {mat.codigo && <div className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">SKU: {mat.codigo}</div>}
                    </div>
                    <span className="text-xs font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-500/30">
                      {mat.cantidad} {mat.unidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick observations for withdrawal */}
          <div className="mb-5">
            <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
              MOTIVO / REMITO DE RETIRO
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Despacho a planta / Maniobra orden #8492"
              className="w-full h-12 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded-lg px-4 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-red-500 dark:focus:border-red-400"
            />
          </div>

          {/* Giant Touch Button for Retiro */}
          <button
            type="button"
            onClick={handleSubmitAction}
            className="w-full min-h-[58px] bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-mono font-bold text-base md:text-lg rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
          >
            <Truck className="w-6 h-6" />
            CONFIRMAR RETIRO DE {detectedContainer.codigoISO} (NIVEL {detectedContainer.nivel})
          </button>
        </div>
      ) : (
        /* INGRESO MODE VIEW */
        <div className="bg-white dark:bg-[#151e27] border-2 border-slate-200 dark:border-[#233140] rounded-xl p-4 md:p-6 shadow-sm dark:shadow-xl space-y-6 transition-colors">
          {/* Street Selector - Large tactile buttons (min 52px) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                1. SELECCIONAR CALLE OPERATIVA
              </label>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                PLAYA D (4 CALLES HABILITADAS)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {config.calles.map((calle) => {
                const isSelected = selectedCalle === calle;
                const calleContainersCount = activeContainers.filter(
                  (c) => c.calle === calle && c.estado === 'DEPOSITADO'
                ).length;

                return (
                  <button
                    key={calle}
                    type="button"
                    onClick={() => setSelectedCalle(calle)}
                    className={`min-h-[54px] rounded-xl font-mono font-bold text-lg md:text-xl flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 border-2 border-teal-500 dark:border-teal-300 shadow-md dark:shadow-[0_0_15px_rgba(20,184,166,0.4)] scale-[1.02]'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#0f1722] dark:hover:bg-[#1c2834] text-slate-900 dark:text-white border-2 border-slate-300 dark:border-[#233140]'
                    }`}
                  >
                    <span>{calle}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-teal-50 dark:text-slate-900 font-semibold' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {calleContainersCount} CONT.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row Selector - Large tactile buttons showing live occupancy (e.g. 2/5) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                2. SELECCIONAR FILA (OCUPACIÓN ACTUAL / {config.alturaMaxima})
              </label>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                CALLE ACTIVA: {selectedCalle}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 gap-2.5">
              {Array.from({ length: config.filasPorCalle }, (_, i) => {
                const filaNumber = i + 1;
                const filaId = `F-${filaNumber < 10 ? '0' + filaNumber : filaNumber}`;
                const rowContainers = activeContainers.filter(
                  (c) =>
                    c.calle === selectedCalle && c.fila === filaId && c.estado === 'DEPOSITADO'
                );
                const height = rowContainers.length;
                const isFull = height >= config.alturaMaxima;
                const isSelected = selectedFila === filaId;

                return (
                  <button
                    key={filaId}
                    type="button"
                    disabled={isFull}
                    onClick={() => setSelectedFila(filaId)}
                    className={`min-h-[56px] rounded-xl p-2 font-mono flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 border-2 border-teal-500 dark:border-teal-300 shadow-md dark:shadow-[0_0_12px_rgba(20,184,166,0.4)] scale-105'
                        : isFull
                        ? 'bg-red-50 dark:bg-[#181115] border-2 border-red-300 dark:border-red-500/40 text-red-500 dark:text-red-400/60 opacity-60 cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#0f1722] dark:hover:bg-[#1a2533] text-slate-900 dark:text-white border-2 border-slate-300 dark:border-[#233140]'
                    }`}
                  >
                    <span className="font-bold text-sm md:text-base leading-tight">
                      {filaId}
                    </span>
                    <span
                      className={`text-[11px] font-bold mt-0.5 ${
                        isSelected
                          ? 'text-teal-50 dark:text-slate-950'
                          : isFull
                          ? 'text-red-600 dark:text-red-400'
                          : height >= 3
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-teal-700 dark:text-teal-400'
                      }`}
                    >
                      {height}/{config.alturaMaxima} {isFull ? 'LLENA' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Automatic Level Assignment Summary Box */}
          <div className="bg-slate-50 dark:bg-[#0b1117] border-2 border-slate-200 dark:border-[#233140] rounded-xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Posicionamiento calculado automáticamente
              </div>
              <div className="text-lg md:text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
                Ubicación seleccionada:{' '}
                <span className="text-teal-700 dark:text-teal-400">
                  {selectedCalle} · {selectedFila}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                {currentHeight === 0
                  ? 'Fila despejada (primer contenedor apoyará sobre piso)'
                  : `Fila con ${currentHeight} contenedor(es) debajo. Nunca se dejan espacios vacíos.`}
              </div>
            </div>

            <div className="text-right bg-white dark:bg-[#151e27] border border-slate-300 dark:border-[#233140] px-5 py-3 rounded-xl min-w-[170px]">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                NIVEL AUTOMÁTICO
              </span>
              <span
                className={`text-2xl md:text-3xl font-mono font-bold ${
                  isRowFull ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-400'
                }`}
              >
                {isRowFull ? 'LLENO (5/5)' : `NIVEL ${assignedLevel}`}
              </span>
              {!isRowFull && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                  {assignedLevel === 1 ? 'BASE: PISO' : `SOBRE NIVEL ${assignedLevel! - 1}`}
                </span>
              )}
            </div>
          </div>

          {/* Additional fast attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
                TIPO CONTENEDOR
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-12 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded-lg px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
              >
                <option value="40' HC">40&apos; HC (High Cube)</option>
                <option value="20' DC">20&apos; DC (Dry Cargo)</option>
                <option value="40' DC">40&apos; DC (Dry Cargo)</option>
                <option value="40' Reefer">40&apos; Reefer</option>
                <option value="20' Open Top">20&apos; Open Top</option>
                <option value="40' Flat Rack">40&apos; Flat Rack</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
                LÍNEA NAVIERA
              </label>
              <select
                value={naviera}
                onChange={(e) => setNaviera(e.target.value)}
                className="w-full h-12 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded-lg px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
              >
                <option value="MSC">MSC</option>
                <option value="Maersk">Maersk</option>
                <option value="CMA CGM">CMA CGM</option>
                <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                <option value="Cosco">Cosco</option>
                <option value="ONE">ONE</option>
                <option value="Hamburg Süd">Hamburg Süd</option>
                <option value="ZIM">ZIM</option>
                <option value="Otra / General">Otra / General</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
                TARA ESTIMADA (KG)
              </label>
              <input
                type="number"
                value={tara}
                onChange={(e) => setTara(e.target.value)}
                placeholder="Ej: 3800"
                className="w-full h-12 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded-lg px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
              />
            </div>
          </div>

          {/* SECTORES ASIGNADOS AL CONTENEDOR */}
          <div className="bg-slate-50 dark:bg-[#0b1117] border-2 border-slate-200 dark:border-[#233140] rounded-xl p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-[#233140]">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-mono font-bold text-sm md:text-base text-slate-900 dark:text-white uppercase tracking-wide">
                  3. SECTORES ASIGNADOS (SELECCIÓN MÚLTIPLE)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 font-bold">
                  {selectedSectores.length} SECTOR(ES)
                </span>
                {selectedSectores.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSectores([])}
                    className="text-xs font-mono text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CONTAINER_SECTORS.map((sector) => {
                const isSelected = selectedSectores.includes(sector);
                return (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => toggleSector(sector)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl font-mono text-xs font-bold border-2 flex items-center justify-between gap-2 text-left transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-slate-950 border-teal-500 dark:border-teal-300 shadow-sm'
                        : 'bg-white hover:bg-slate-100 dark:bg-[#151e27] dark:hover:bg-[#1c2834] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-[#233140]'
                    }`}
                  >
                    <span className="leading-tight">{sector}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN LISTADO DE MATERIALES DENTRO DEL CONTENEDOR */}
          <div className="bg-slate-50 dark:bg-[#0b1117] border-2 border-slate-200 dark:border-[#233140] rounded-xl p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-[#233140]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-mono font-bold text-sm md:text-base text-slate-900 dark:text-white uppercase tracking-wide">
                  LISTADO DE MATERIALES / MANIFIESTO DE CARGA
                </h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 font-bold">
                {materiales.length} ÍTEM(S) AGREGADO(S)
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="mb-3">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mb-1.5 uppercase">
                CARGA RÁPIDA DE MATERIALES FRECUENTES:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { desc: 'Motores 250cc 4T Monocilíndricos', qty: 60, unit: 'PALLETS', code: 'MOT-250' },
                  { desc: 'Chasis Tubulares de Acero', qty: 90, unit: 'BULTOS', code: 'CHA-150' },
                  { desc: 'Baterías de Litio 48V 26Ah', qty: 200, unit: 'BULTOS', code: 'BAT-LIT' },
                  { desc: 'Neumáticos Tubeless 110/80-17', qty: 350, unit: 'UNID', code: 'NEU-17' },
                  { desc: 'Ópticas Delanteras LED', qty: 450, unit: 'CAJAS', code: 'FAR-LED' },
                  { desc: 'Aceite Lubricante 4T 20W50', qty: 36, unit: 'TAMBORES', code: 'LUB-20W' }
                ].map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleQuickTag(preset.desc, preset.qty, preset.unit, preset.code)}
                    className="px-2.5 py-1 bg-white hover:bg-teal-600 hover:text-white dark:bg-[#151e27] dark:hover:bg-teal-500 dark:hover:text-black text-slate-700 dark:text-slate-300 rounded text-xs font-mono border border-slate-300 dark:border-[#233140] hover:border-teal-500 dark:hover:border-teal-400 transition-all flex items-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span>{preset.desc.split(' ')[0]} ({preset.qty} {preset.unit})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual item inputs */}
            <div className="bg-white dark:bg-[#151e27] p-3 rounded-lg border border-slate-200 dark:border-[#233140] mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-2">
                <div className="sm:col-span-5">
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1 uppercase">
                    DESCRIPCIÓN DEL MATERIAL *
                  </label>
                  <input
                    type="text"
                    value={matDesc}
                    onChange={(e) => setMatDesc(e.target.value)}
                    placeholder="Ej: Repuestos, Baterías, Filtros..."
                    className="w-full h-11 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1 uppercase">
                    CÓDIGO / SKU
                  </label>
                  <input
                    type="text"
                    value={matCodigo}
                    onChange={(e) => setMatCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: SKU-01"
                    className="w-full h-11 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded px-3 text-sm font-mono text-slate-900 dark:text-white uppercase focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1 uppercase">
                    CANTIDAD
                  </label>
                  <input
                    type="number"
                    value={matCant}
                    onChange={(e) => setMatCant(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full h-11 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded px-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 text-center font-bold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mb-1 uppercase">
                    UNIDAD
                  </label>
                  <select
                    value={matUnidad}
                    onChange={(e) => setMatUnidad(e.target.value)}
                    className="w-full h-11 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded px-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
                  >
                    <option value="BULTOS">BULTOS</option>
                    <option value="PALLETS">PALLETS</option>
                    <option value="UNID">UNIDADES</option>
                    <option value="CAJAS">CAJAS</option>
                    <option value="TAMBORES">TAMBORES</option>
                    <option value="KG">KILOS (KG)</option>
                  </select>
                </div>
              </div>

              {/* Quick Stepper buttons and Add button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#233140]/60">
                <div className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>CANTIDAD:</span>
                  {[+1, +10, +50, +100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setMatCant((prev) => Math.max(1, prev + step))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1117] dark:hover:bg-[#202d3a] border border-slate-300 dark:border-[#233140] rounded text-teal-700 dark:text-teal-300 font-bold"
                    >
                      +{step}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMatCant(1)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1117] text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-[#233140] rounded"
                  >
                    1
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="h-10 px-4 bg-teal-600 hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-black font-mono font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  AGREGAR AL CONTENEDOR
                </button>
              </div>
            </div>

            {/* List of currently added materials */}
            {materiales.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {materiales.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#151e27] border border-slate-200 dark:border-[#233140] px-3 py-2 rounded-lg flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-teal-700 dark:text-teal-400 font-bold">#{idx + 1}</span>
                      <span className="text-slate-900 dark:text-white font-bold">{item.descripcion}</span>
                      {item.codigo && (
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-black/40 px-1.5 py-0.5 rounded">
                          [{item.codigo}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-500/30">
                        {item.cantidad} {item.unidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(item.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                        title="Quitar ítem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-slate-500 font-mono italic">
                Ningún material cargado aún. Puede usar los botones rápidos arriba o ingresar ítems manualmente.
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1.5 uppercase">
              OBSERVACIONES / ESTADO FÍSICO (OPCIONAL)
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Sin daños visibles, precinto en regla..."
              className="w-full h-12 bg-slate-50 dark:bg-[#0b1117] border border-slate-300 dark:border-[#233140] rounded-lg px-4 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
            />
          </div>

          {/* Giant Touch Button for Ingreso (min 56px) */}
          <button
            type="button"
            disabled={!cleanIso || isRowFull}
            onClick={handleSubmitAction}
            className={`w-full min-h-[58px] rounded-xl font-mono font-bold text-base md:text-lg flex items-center justify-center gap-3 transition-all ${
              !cleanIso || isRowFull
                ? 'bg-slate-200 dark:bg-[#1e293b] text-slate-500 border border-slate-300 dark:border-[#233140] cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-500 active:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 dark:active:bg-teal-600 text-white dark:text-slate-950 shadow-lg shadow-teal-600/20 dark:shadow-xl dark:shadow-teal-500/25 active:scale-[0.99]'
            }`}
          >
            <ArrowDown className="w-6 h-6" />
            {isRowFull
              ? 'FILA COMPLETA (5/5) - SELECCIONAR OTRA FILA'
              : !cleanIso
              ? 'INGRESE CÓDIGO ISO PARA CONFIRMAR INGRESO'
              : `CONFIRMAR INGRESO EN ${selectedCalle} / ${selectedFila} (NIVEL ${assignedLevel})`}
          </button>
        </div>
      )}

      {/* Security notice */}
      <div className="text-center font-mono text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        Sistema de bloqueo de concurrencia (LockService) activo · Operaciones seguras en cabina
      </div>
    </div>
  );
};
