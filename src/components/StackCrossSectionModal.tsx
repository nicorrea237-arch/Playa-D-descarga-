import React from 'react';
import { X, Layers, ArrowDown, Trash2, Calendar, ShieldCheck, Package, Building2 } from 'lucide-react';
import { Container } from '../types/container';

interface StackCrossSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  calle: string;
  fila: string;
  containers: Container[];
  onWithdraw: (codigoISO: string) => void;
  highlightedCode?: string | null;
}

export const StackCrossSectionModal: React.FC<StackCrossSectionModalProps> = ({
  isOpen,
  onClose,
  calle,
  fila,
  containers,
  onWithdraw,
  highlightedCode,
}) => {
  if (!isOpen) return null;

  // Filter and sort stack from Level 5 (top) down to Level 1 (ground)
  const stack = containers
    .filter((c) => c.calle === calle && c.fila === fila && c.estado === 'DEPOSITADO')
    .sort((a, b) => b.nivel - a.nivel);

  const totalOccupied = stack.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#151e27] border-2 border-slate-300 dark:border-[#233140] w-full max-w-xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-[#0f1722] px-5 py-4 border-b border-slate-200 dark:border-[#233140] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 rounded-lg text-teal-700 dark:text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white tracking-wide text-lg font-mono">
                  CORTE VERTICAL: {calle} / {fila}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold tabular-nums ${
                    totalOccupied === 5
                      ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                      : 'bg-teal-50 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30'
                  }`}
                >
                  {totalOccupied}/5 NIVELES
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Pila física ordenada de Nivel 5 (tope) a Nivel 1 (piso)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Reach Stacker Spreader Bar */}
        <div className="bg-slate-100 dark:bg-[#0b1117] px-4 py-2 border-b border-slate-200 dark:border-[#233140] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
          <span className="text-teal-700 dark:text-teal-400 font-semibold">
            SPREADER TFC 45H · PLAYA D
          </span>
          <span>ESTIBA MÁXIMA: 5 NIVELES</span>
        </div>

        {/* Stack list rendered from Level 5 to Level 1 */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-white dark:bg-[#151e27]">
          {[5, 4, 3, 2, 1].map((lvl) => {
            const container = stack.find((c) => c.nivel === lvl);
            const isTopOccupied = container && lvl === totalOccupied;
            const hasAbove = container && totalOccupied > lvl;

            const isHighlighted = !!(highlightedCode && container && container.codigoISO === highlightedCode);

            if (container) {
              return (
                <div
                  key={lvl}
                  className={`rounded-xl p-3.5 relative overflow-hidden shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                    isHighlighted
                      ? 'bg-amber-50 dark:bg-[#1e1712] border-2 border-amber-500 dark:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-[1.01]'
                      : 'bg-slate-50 dark:bg-[#0f1722] border-2 border-teal-500/40 hover:border-teal-600 dark:hover:border-teal-400'
                  }`}
                >
                  {/* Left level indicator */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-16 h-12 rounded-lg flex flex-col items-center justify-center font-mono shrink-0 ${
                        isHighlighted
                          ? 'bg-amber-500 text-black font-black shadow-md'
                          : 'bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 text-teal-800 dark:text-teal-400'
                      }`}
                    >
                      <span className={`text-[10px] leading-none ${isHighlighted ? 'text-black font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                        NIVEL
                      </span>
                      <span className="text-xl font-bold leading-tight">{lvl}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-lg text-slate-900 dark:text-white tracking-wider">
                          {container.codigoISO}
                        </span>
                        {isHighlighted && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500 text-black font-black border border-amber-300 shadow-sm">
                            CONTENEDOR LOCALIZADO
                          </span>
                        )}
                        {isTopOccupied && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 font-bold">
                            TOPE
                          </span>
                        )}
                        {lvl === 1 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30 font-bold">
                            PISO
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <span className="bg-white dark:bg-[#151e27] border border-slate-200 dark:border-transparent px-2 py-0.5 rounded text-teal-800 dark:text-teal-300 font-mono">
                          {container.naviera}
                        </span>
                        <span>{container.tipo}</span>
                        {container.tara && <span>{container.tara} kg</span>}
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(container.fechaIngreso).toLocaleDateString()}
                        </span>
                      </div>

                      {hasAbove && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 font-mono font-semibold">
                          <ArrowDown className="w-3 h-3" />
                          Al retirar, {totalOccupied - lvl} contenedor(es) encima bajarán por gravedad
                        </div>
                      )}

                      {/* Sectores asignados */}
                      {container.sectores && container.sectores.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            SECTORES:
                          </span>
                          {container.sectores.map((sec) => (
                            <span
                              key={sec}
                              className="text-[10px] font-mono font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-500/30"
                            >
                              {sec}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Materiales declarados */}
                      {container.materiales && container.materiales.length > 0 && (
                        <div className="mt-2 bg-white dark:bg-[#0b1117] p-2 rounded-lg border border-slate-200 dark:border-[#233140] flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            MATERIALES ({container.materiales.length}):
                          </span>
                          {container.materiales.map((m) => (
                            <span
                              key={m.id}
                              className="text-[11px] font-mono bg-slate-50 dark:bg-[#151e27] text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-[#233140]"
                            >
                              <strong className="text-teal-700 dark:text-teal-300">{m.cantidad} {m.unidad}</strong> · {m.descripcion}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Withdraw Button */}
                  <button
                    onClick={() => onWithdraw(container.codigoISO)}
                    className="h-11 px-4 bg-red-100 hover:bg-red-600 dark:bg-red-500/20 dark:hover:bg-red-500 text-red-700 dark:text-red-200 hover:text-white border border-red-300 dark:border-red-500/40 rounded-lg font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap shadow-sm"
                    title={`Retirar contenedor ${container.codigoISO}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    RETIRAR
                  </button>
                </div>
              );
            }

            // Empty slot
            return (
              <div
                key={lvl}
                className="border border-dashed border-slate-300 dark:border-[#233140] rounded-xl p-3 bg-slate-50/70 dark:bg-[#0b1117]/50 flex items-center gap-3 text-slate-500 opacity-75"
              >
                <div className="w-16 h-10 border border-slate-300 dark:border-slate-700/50 rounded-lg flex flex-col items-center justify-center font-mono text-slate-500">
                  <span className="text-[9px] leading-none">NIVEL</span>
                  <span className="text-base font-bold leading-tight">{lvl}</span>
                </div>
                <div className="font-mono text-xs italic tracking-wide">
                  [ Espacio libre disponible para estiba ]
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-[#0f1722] p-3 border-t border-slate-200 dark:border-[#233140] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Reacomodamiento gravitacional activo
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-[#1e293b] dark:hover:bg-[#334155] text-slate-900 dark:text-white rounded font-mono text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
