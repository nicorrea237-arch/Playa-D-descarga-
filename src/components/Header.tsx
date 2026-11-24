import React, { useState, useEffect } from 'react';
import { Clock, Layers, FileCode, RotateCcw, Sun, Moon } from 'lucide-react';
import logoLaEmilia from '../../LaEmilia_Logosnuevos2023_Mesa de trabajo 1.jpg';

interface HeaderProps {
  totalOccupied: number;
  maxCapacity: number;
  onOpenGasModal: () => void;
  onResetDemo: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalOccupied,
  maxCapacity,
  onOpenGasModal,
  onResetDemo,
  theme,
  onToggleTheme,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const occupancyPercent = ((totalOccupied / maxCapacity) * 100).toFixed(1);

  return (
    <header className="bg-[#0f1722] border-b-2 border-[#233140] px-4 py-3 md:px-6 flex flex-wrap items-center justify-between gap-3">
      {/* Logo La Emilia & Playa D */}
      <div className="flex items-center gap-3">
        <div className="bg-white px-2.5 py-1 rounded-lg shadow-sm border border-slate-200/80 flex items-center justify-center no-theme-invert">
          <img
            src={logoLaEmilia}
            alt="La Emilia - Negocios de movilidad"
            className="h-9 md:h-10 w-auto object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-lg md:text-xl text-white tracking-wide">
              PLAYA D
            </h1>
            <span className="text-xs bg-teal-500/10 border border-teal-500/30 text-teal-300 px-2 py-0.5 rounded font-mono font-semibold">
              REACH STACKER TFC 45H
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span>TERMINAL LOGÍSTICA</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              CABINA 10" OPERATIVA
            </span>
          </div>
        </div>
      </div>

      {/* Métricas y Botones */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs font-mono">
        {/* Botón Modo Sol / Noche */}
        <button
          onClick={onToggleTheme}
          className="h-10 px-3 bg-[#151e27] hover:bg-[#1c2834] text-teal-300 border border-[#233140] hover:border-teal-400 rounded-lg font-bold flex items-center gap-1.5 transition-all active:scale-95"
          title={theme === 'dark' ? 'Cambiar a Modo Iluminado (Sol)' : 'Cambiar a Modo Oscuro (Noche)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 no-theme-invert" />
              <span className="hidden sm:inline">MODO SOL</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-teal-300" />
              <span className="hidden sm:inline">MODO NOCHE</span>
            </>
          )}
        </button>

        {/* Reloj */}
        <div className="bg-[#151e27] border border-[#233140] px-3 py-2 rounded-lg flex items-center gap-2 text-slate-200">
          <Clock className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-sm text-white">{time || '--:--:--'}</span>
        </div>

        {/* Ocupación */}
        <div className="bg-[#151e27] border border-[#233140] px-3 py-2 rounded-lg flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <div>
            <span className="text-[10px] text-slate-400 block leading-tight">OCUPACIÓN PLAYA D</span>
            <span className="font-bold text-sm text-teal-300">
              {totalOccupied} / {maxCapacity} TEU ({occupancyPercent}%)
            </span>
          </div>
        </div>

        {/* Botón GAS */}
        <button
          onClick={onOpenGasModal}
          className="h-10 px-3 bg-[#1e293b] hover:bg-[#334155] text-teal-300 border border-teal-500/30 hover:border-teal-400 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          title="Ver y exportar scripts listos para Google Sheets (Code.gs e index.html)"
        >
          <FileCode className="w-4 h-4 text-teal-400" />
          <span className="hidden sm:inline">GOOGLE APPS SCRIPT</span>
          <span className="sm:hidden">GAS</span>
        </button>

        {/* Botón Reset */}
        <button
          onClick={onResetDemo}
          className="h-10 px-2.5 bg-[#151e27] hover:bg-[#1c2834] text-slate-400 hover:text-slate-200 border border-[#233140] rounded-lg transition-all active:scale-95"
          title="Restablecer flota inicial de prueba"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
