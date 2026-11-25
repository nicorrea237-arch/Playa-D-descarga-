import React, { useState, useEffect } from 'react';
import { Clock, Layers, FileCode, RotateCcw, Sun, Moon } from 'lucide-react';
import { LaEmiliaLogo } from './LaEmiliaLogo';

interface HeaderProps {
  totalOccupied: number;
  maxCapacity: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenGasModal: () => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalOccupied,
  maxCapacity,
  theme,
  onToggleTheme,
  onOpenGasModal,
  onResetDemo,
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
  const isDark = theme === 'dark';

  return (
    <header className="bg-white dark:bg-[#0f1722] border-b-2 border-slate-200 dark:border-[#233140] px-4 py-3 md:px-6 flex flex-wrap items-center justify-between gap-3 transition-colors">
      {/* La Emilia Brand & Terminal Title */}
      <div className="flex items-center gap-3">
        <LaEmiliaLogo />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-lg md:text-xl text-slate-900 dark:text-white tracking-wide whitespace-nowrap">
              PLAYA D
            </h1>
            <span className="text-xs bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded font-mono font-semibold whitespace-nowrap">
              REACH STACKER TFC 45H
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2">
            <span>TERMINAL LOGÍSTICA LA EMILIA</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              CABINA 10&quot; OPERATIVA
            </span>
          </div>
        </div>
      </div>

      {/* Center / Right Metrics & Quick Actions */}
      <div className="flex flex-wrap items-center gap-2 md:gap-2.5 text-xs font-mono">
        {/* Day / Night Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="h-10 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#151e27] dark:hover:bg-[#1c2834] text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-[#233140] hover:border-teal-500 dark:hover:border-teal-400 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap shrink-0"
          title={isDark ? 'Cambiar a modo diurno (alto contraste solar)' : 'Cambiar a modo nocturno (bajo deslumbramiento)'}
          aria-label={isDark ? 'Activar modo diurno' : 'Activar modo nocturno'}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span>DIURNO</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-700 shrink-0" />
              <span>NOCTURNO</span>
            </>
          )}
        </button>

        {/* Clock */}
        <div className="h-10 bg-slate-100 dark:bg-[#151e27] border border-slate-300 dark:border-[#233140] px-3 rounded-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
            {time || '--:--:--'}
          </span>
        </div>

        {/* Occupancy Indicator */}
        <div className="h-10 bg-slate-100 dark:bg-[#151e27] border border-slate-300 dark:border-[#233140] px-3 rounded-lg flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <div className="leading-tight">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-none">
              OCUPACIÓN PLAYA D
            </span>
            <span className="font-bold text-xs sm:text-sm text-teal-700 dark:text-teal-300 tabular-nums">
              {totalOccupied} / {maxCapacity} TEU ({occupancyPercent}%)
            </span>
          </div>
        </div>

        {/* GAS Exporter Button */}
        <button
          type="button"
          onClick={onOpenGasModal}
          className="h-10 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#1e293b] dark:hover:bg-[#334155] text-teal-800 dark:text-teal-300 border border-teal-500/40 dark:border-teal-500/30 hover:border-teal-600 dark:hover:border-teal-400 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0"
          title="Ver y exportar scripts listos para Google Sheets (Code.gs e index.html)"
        >
          <FileCode className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="hidden sm:inline">GOOGLE APPS SCRIPT</span>
          <span className="sm:hidden">GAS</span>
        </button>

        {/* Reset Demo Fleet Button */}
        <button
          type="button"
          onClick={onResetDemo}
          className="h-10 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#151e27] dark:hover:bg-[#1c2834] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-[#233140] rounded-lg transition-all active:scale-95 shrink-0"
          title="Restablecer flota inicial de prueba"
          aria-label="Restablecer flota inicial de prueba"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
