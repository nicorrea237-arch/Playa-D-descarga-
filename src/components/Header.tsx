import React, { useState, useEffect } from 'react';
import { Truck, Clock, Layers, FileCode, RotateCcw } from 'lucide-react';

interface HeaderProps {
  totalOccupied: number;
  maxCapacity: number;
  onOpenGasModal: () => void;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalOccupied,
  maxCapacity,
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

  return (
    <header className="bg-[#0f1722] border-b-2 border-[#233140] px-4 py-3 md:px-6 flex flex-wrap items-center justify-between gap-3">
      {/* Brand & Reach Stacker Machine Tag */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-teal-400 to-teal-600 text-slate-950 font-black font-mono px-3 py-1.5 rounded-lg text-lg tracking-wider shadow-[0_0_15px_rgba(20,184,166,0.3)] flex items-center gap-1.5">
          <Truck className="w-5 h-5 text-black" />
          TEREX
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

      {/* Center / Right Metrics & Quick Actions */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs font-mono">
        {/* Clock */}
        <div className="bg-[#151e27] border border-[#233140] px-3 py-2 rounded-lg flex items-center gap-2 text-slate-200">
          <Clock className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-sm text-white">{time || '--:--:--'}</span>
        </div>

        {/* Occupancy Indicator */}
        <div className="bg-[#151e27] border border-[#233140] px-3 py-2 rounded-lg flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <div>
            <span className="text-[10px] text-slate-400 block leading-tight">OCUPACIÓN PLAYA D</span>
            <span className="font-bold text-sm text-teal-300">
              {totalOccupied} / {maxCapacity} TEU ({occupancyPercent}%)
            </span>
          </div>
        </div>

        {/* GAS Exporter Button */}
        <button
          onClick={onOpenGasModal}
          className="h-10 px-3 bg-[#1e293b] hover:bg-[#334155] text-teal-300 border border-teal-500/30 hover:border-teal-400 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          title="Ver y exportar scripts listos para Google Sheets (Code.gs e index.html)"
        >
          <FileCode className="w-4 h-4 text-teal-400" />
          <span className="hidden sm:inline">GOOGLE APPS SCRIPT</span>
          <span className="sm:hidden">GAS</span>
        </button>

        {/* Reset Demo Fleet Button */}
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
