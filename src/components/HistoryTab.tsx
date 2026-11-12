import React, { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  ArrowDown,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  User,
  ShieldCheck
} from 'lucide-react';
import { MovementRecord, MovementType } from '../types/container';

interface HistoryTabProps {
  movements: MovementRecord[];
  onClearHistory: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ movements, onClearHistory }) => {
  const [filterType, setFilterType] = useState<string>('TODOS');

  const filtered = movements.filter((m) => {
    if (filterType === 'TODOS') return true;
    return m.tipo === filterType;
  });

  const exportCsv = () => {
    const headers = [
      'ID_MOVIMIENTO',
      'TIPO',
      'CODIGO_ISO',
      'CALLE',
      'FILA',
      'NIVEL_ORIGEN',
      'NIVEL_DESTINO',
      'FECHA_HORA',
      'OPERADOR',
      'MOTIVO'
    ];

    const rows = filtered.map((m) => [
      m.id,
      m.tipo,
      m.codigoISO,
      m.calle,
      m.fila,
      m.nivelOrigen ?? '',
      m.nivelDestino ?? '',
      m.timestamp,
      m.operador,
      `"${(m.motivo || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_terex_playa_d_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header controls */}
      <div className="bg-[#151e27] border-2 border-[#233140] rounded-xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            <h2 className="font-mono font-bold text-lg text-white tracking-wide">
              AUDITORÍA DE MOVIMIENTOS Y REACOMODAMIENTOS
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Trazabilidad completa: Ingresos, Retiros y Descensos por Gravedad de la Reach Stacker Terex
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="h-10 px-3 bg-[#0f1722] hover:bg-[#1c2834] text-teal-300 border border-teal-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            title="Exportar auditoría en formato CSV"
          >
            <Download className="w-4 h-4 text-teal-400" />
            EXPORTAR CSV
          </button>

          <button
            onClick={onClearHistory}
            className="h-10 px-3 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all"
            title="Limpiar registro de auditoría local"
          >
            <Trash2 className="w-4 h-4" />
            LIMPIAR
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {['TODOS', 'INGRESO', 'RETIRO', 'REACOMODAMIENTO'].map((type) => {
          const isSelected = filterType === type;
          const count = movements.filter((m) => type === 'TODOS' || m.tipo === type).length;

          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 border ${
                isSelected
                  ? 'bg-teal-500 text-black border-teal-400 shadow-md'
                  : 'bg-[#151e27] text-slate-400 hover:text-white border-[#233140]'
              }`}
            >
              <span>{type}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  isSelected ? 'bg-black/30 text-black' : 'bg-[#0f1722] text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#151e27] border-2 border-[#233140] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0f1722] text-teal-300 border-b-2 border-[#233140]">
              <tr>
                <th className="py-3 px-4">FECHA / HORA</th>
                <th className="py-3 px-4">TIPO MANIOBRA</th>
                <th className="py-3 px-4">CONTENEDOR</th>
                <th className="py-3 px-4">UBICACIÓN</th>
                <th className="py-3 px-4">TRANSICIÓN NIVEL</th>
                <th className="py-3 px-4">MOTIVO / AUDITORÍA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#233140]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se registran movimientos con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isIngreso = m.tipo === 'INGRESO';
                  const isRetiro = m.tipo === 'RETIRO';
                  const isReacomod = m.tipo === 'REACOMODAMIENTO';

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[#1a2533] transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {new Date(m.timestamp).toLocaleDateString('es-AR')}{' '}
                            {new Date(m.timestamp).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border ${
                            isIngreso
                              ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                              : isRetiro
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {isIngreso && <ArrowDown className="w-3 h-3 text-teal-400" />}
                          {isRetiro && <ArrowUpRight className="w-3 h-3 text-red-400" />}
                          {isReacomod && <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />}
                          {m.tipo}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-white tracking-wider whitespace-nowrap">
                        {m.codigoISO}
                      </td>

                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <span className="text-teal-400 font-bold">{m.calle}</span> /{' '}
                        <span>{m.fila}</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isIngreso && (
                          <span className="text-teal-300 font-bold">
                            ➔ Nivel {m.nivelDestino} (Asignado)
                          </span>
                        )}
                        {isRetiro && (
                          <span className="text-red-400 font-bold">
                            Nivel {m.nivelOrigen} ➔ Retirado
                          </span>
                        )}
                        {isReacomod && (
                          <span className="text-amber-300 font-bold flex items-center gap-1">
                            Nivel {m.nivelOrigen} <ArrowDown className="w-3 h-3 text-amber-400" /> Nivel {m.nivelDestino}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {m.motivo || 'Operación en regla'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
