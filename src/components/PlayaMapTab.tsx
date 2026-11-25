import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { Container, PlayaConfig } from '../types/container';

interface PlayaMapTabProps {
  config: PlayaConfig;
  activeContainers: Container[];
  onOpenRowModal: (calle: string, fila: string) => void;
  highlightedRow?: { calle: string; fila: string } | null;
}

export const PlayaMapTab: React.FC<PlayaMapTabProps> = ({
  config,
  activeContainers,
  onOpenRowModal,
  highlightedRow,
}) => {
  const [activeStreetFilter, setActiveStreetFilter] = useState<string>('TODAS');

  const visibleStreets =
    activeStreetFilter === 'TODAS'
      ? config.calles
      : config.calles.filter((c) => c === activeStreetFilter);

  return (
    <div className="space-y-5">
      {/* Top Controls / Filters */}
      <div className="bg-white dark:bg-[#151e27] border-2 border-slate-200 dark:border-[#233140] rounded-xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm dark:shadow-none transition-colors">
        <div>
          <h2 className="font-mono font-bold text-lg text-slate-900 dark:text-white tracking-wide">
            TOPOLOGÍA DE PLAYA D · MAPA DE ESTIBAS
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
            4 calles operativas · 15 filas por calle · Estiba vertical máxima: 5 niveles
          </p>
        </div>

        {/* Street selector tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-[#0b1117] p-1.5 rounded-lg border border-slate-300 dark:border-[#233140]">
          <button
            onClick={() => setActiveStreetFilter('TODAS')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all whitespace-nowrap ${
              activeStreetFilter === 'TODAS'
                ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            TODAS (4 CALLES)
          </button>
          {config.calles.map((calle) => (
            <button
              key={calle}
              onClick={() => setActiveStreetFilter(calle)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all whitespace-nowrap ${
                activeStreetFilter === calle
                  ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-black shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {calle}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Streets */}
      <div
        className={`grid gap-5 ${
          activeStreetFilter === 'TODAS'
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
            : 'grid-cols-1'
        }`}
      >
        {visibleStreets.map((calle) => {
          const streetContainers = activeContainers.filter(
            (c) => c.calle === calle && c.estado === 'DEPOSITADO'
          );
          const streetCapacity = config.filasPorCalle * config.alturaMaxima; // 15 * 5 = 75
          const streetOccupancyPercent = (
            (streetContainers.length / streetCapacity) *
            100
          ).toFixed(1);

          return (
            <div
              key={calle}
              className="bg-white dark:bg-[#101720] border-2 border-slate-200 dark:border-[#233140] rounded-xl p-4 flex flex-col shadow-sm dark:shadow-lg transition-colors"
            >
              {/* Street Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#233140] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 rounded font-mono font-bold text-base text-teal-800 dark:text-teal-300">
                    {calle}
                  </div>
                  <div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block leading-none">
                      CALLE OPERATIVA
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {streetContainers.length} / {streetCapacity} TEU
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block leading-none">
                    OCUPACIÓN
                  </span>
                  <span
                    className={`text-xs font-mono font-bold tabular-nums ${
                      parseFloat(streetOccupancyPercent) > 60
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-teal-700 dark:text-teal-400'
                    }`}
                  >
                    {streetOccupancyPercent}%
                  </span>
                </div>
              </div>

              {/* Rows List (F-01 to F-15) */}
              <div className="space-y-2 flex-1">
                {Array.from({ length: config.filasPorCalle }, (_, idx) => {
                  const filaNumber = idx + 1;
                  const filaId = `F-${filaNumber < 10 ? '0' + filaNumber : filaNumber}`;
                  const rowStack = streetContainers
                    .filter((c) => c.fila === filaId)
                    .sort((a, b) => a.nivel - b.nivel);
                  const count = rowStack.length;
                  const isFull = count >= config.alturaMaxima;
                  const topContainer = count > 0 ? rowStack[count - 1] : null;

                  const isRowHighlighted = !!(highlightedRow && highlightedRow.calle === calle && highlightedRow.fila === filaId);

                  return (
                    <button
                      key={filaId}
                      type="button"
                      onClick={() => onOpenRowModal(calle, filaId)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between group cursor-pointer ${
                        isRowHighlighted
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-500 dark:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse'
                          : isFull
                          ? 'bg-red-50 dark:bg-[#181216] border-red-300 dark:border-red-500/30 hover:border-red-500 dark:hover:border-red-400'
                          : count > 0
                          ? 'bg-slate-50 dark:bg-[#151e27] border-slate-300 dark:border-[#233140] hover:border-teal-500 dark:hover:border-teal-400'
                          : 'bg-slate-50/50 dark:bg-[#0f1722]/60 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Left: Row name & count */}
                      <div className="flex items-center gap-2.5">
                        <span className={`font-mono font-bold text-sm ${isRowHighlighted ? 'text-amber-800 dark:text-amber-300' : 'text-slate-900 dark:text-white'} group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors`}>
                          {filaId}
                        </span>

                        {isRowHighlighted && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500 text-black font-black shadow-sm">
                            MATERIAL AQUÍ
                          </span>
                        )}

                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded font-bold tabular-nums ${
                            isRowHighlighted
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-400 dark:border-amber-500/40'
                              : isFull
                              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                              : count >= 3
                              ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/20'
                              : count > 0
                              ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-500'
                          }`}
                        >
                          {count}/{config.alturaMaxima} {isFull ? 'LLENA' : ''}
                        </span>
                      </div>

                      {/* Right: Stack Visualizer (5 blocks) + Inspect icon */}
                      <div className="flex items-center gap-3">
                        {/* 5-tier stacked preview */}
                        <div className="flex items-end gap-1 h-5">
                          {[1, 2, 3, 4, 5].map((lvl) => {
                            const isFilled = lvl <= count;
                            return (
                              <div
                                key={lvl}
                                className={`w-2.5 rounded-xs transition-all ${
                                  isFilled
                                    ? isFull
                                      ? 'h-full bg-red-500 dark:bg-red-400'
                                      : 'h-full bg-teal-600 dark:bg-teal-400'
                                    : 'h-1.5 bg-slate-300 dark:bg-slate-800'
                                }`}
                                title={`Nivel ${lvl}: ${isFilled ? 'Ocupado' : 'Libre'}`}
                              />
                            );
                          })}
                        </div>

                        {topContainer && (
                          <span className="hidden sm:inline font-mono text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 truncate max-w-[85px]">
                            {topContainer.codigoISO.slice(-6)}
                          </span>
                        )}

                        <div className="text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 p-1">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
