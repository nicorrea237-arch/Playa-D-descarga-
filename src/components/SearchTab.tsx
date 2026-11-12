import React, { useState } from 'react';
import { Search, MapPin, Trash2, Calendar, Filter, XCircle, ArrowRight, Package } from 'lucide-react';
import { Container } from '../types/container';

interface SearchTabProps {
  containers: Container[];
  onOpenRowModal: (calle: string, fila: string) => void;
  onWithdraw: (codigoISO: string) => void;
  onSelectForOperation: (codigoISO: string) => void;
  onLocateOnMap?: (calle: string, fila: string, codigoISO: string) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  containers,
  onOpenRowModal,
  onWithdraw,
  onSelectForOperation,
  onLocateOnMap,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCalle, setFilterCalle] = useState('TODAS');
  const [filterNaviera, setFilterNaviera] = useState('TODAS');
  const [filterEstado, setFilterEstado] = useState<'ACTIVOS' | 'TODOS' | 'RETIRADOS'>('ACTIVOS');

  const cleanQuery = searchTerm.trim().toUpperCase();

  const filtered = containers.filter((c) => {
    // Search query match (by ISO code or Material description / SKU)
    if (cleanQuery) {
      const matchesCode = c.codigoISO.toUpperCase().includes(cleanQuery);
      const matchesMaterial = c.materiales?.some(
        (m) =>
          m.descripcion.toUpperCase().includes(cleanQuery) ||
          (m.codigo && m.codigo.toUpperCase().includes(cleanQuery))
      );
      if (!matchesCode && !matchesMaterial) {
        return false;
      }
    }
    // Street filter
    if (filterCalle !== 'TODAS' && c.calle !== filterCalle) {
      return false;
    }
    // Shipping line filter
    if (filterNaviera !== 'TODAS' && c.naviera !== filterNaviera) {
      return false;
    }
    // Status filter
    if (filterEstado === 'ACTIVOS' && c.estado !== 'DEPOSITADO') {
      return false;
    }
    if (filterEstado === 'RETIRADOS' && c.estado !== 'RETIRADO') {
      return false;
    }
    return true;
  });

  const uniqueLines = Array.from(new Set(containers.map((c) => c.naviera))).filter(Boolean);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Search Input Card */}
      <div className="bg-[#151e27] border-2 border-[#233140] rounded-xl p-4 md:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-teal-400" />
          <h2 className="font-mono font-bold text-lg text-white tracking-wide">
            BUSCADOR INSTANTÁNEO POR CÓDIGO ISO O MATERIALES
          </h2>
        </div>

        <div className="relative mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            placeholder="Buscar por ISO o contenido (ej: MSKU, motores, baterías, chasis, repuestos...)"
            className="w-full h-14 bg-[#0b1117] border-2 border-[#233140] focus:border-teal-400 rounded-xl px-4 pl-12 text-base md:text-lg font-mono font-bold text-white uppercase placeholder-slate-600 focus:outline-none focus:shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all"
          />
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-2"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Material Filter Chips */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-teal-400" />
            BÚSQUEDA RÁPIDA:
          </span>
          {[
            { label: 'Motores', query: 'MOTORES' },
            { label: 'Baterías Litio', query: 'BATERÍAS' },
            { label: 'Chasis', query: 'CHASIS' },
            { label: 'Neumáticos', query: 'NEUMÁTICOS' },
            { label: 'Ópticas LED', query: 'ÓPTICAS' },
            { label: 'Aceite 20W50', query: 'ACEITE' },
            { label: 'Cadenas 520H', query: 'CADENAS' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setSearchTerm(chip.query)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all ${
                searchTerm === chip.query
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'bg-[#0f1722] hover:bg-[#1e293b] text-slate-300 border-[#233140] hover:border-slate-500'
              }`}
            >
              {chip.label}
            </button>
          ))}
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-white"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {/* Quick Filter Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">ESTADO:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as any)}
              className="w-full h-10 bg-[#0f1722] border border-[#233140] rounded-lg px-2.5 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="ACTIVOS">ACTIVOS EN PLAYA D</option>
              <option value="TODOS">TODOS (HISTÓRICOS)</option>
              <option value="RETIRADOS">SOLO RETIRADOS</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">CALLE:</label>
            <select
              value={filterCalle}
              onChange={(e) => setFilterCalle(e.target.value)}
              className="w-full h-10 bg-[#0f1722] border border-[#233140] rounded-lg px-2.5 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="TODAS">TODAS LAS CALLES</option>
              <option value="C-01">C-01</option>
              <option value="C-02">C-02</option>
              <option value="C-03">C-03</option>
              <option value="C-04">C-04</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">LÍNEA NAVIERA:</label>
            <select
              value={filterNaviera}
              onChange={(e) => setFilterNaviera(e.target.value)}
              className="w-full h-10 bg-[#0f1722] border border-[#233140] rounded-lg px-2.5 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="TODAS">TODAS LAS NAVIERAS</option>
              {uniqueLines.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span>RESULTADOS ENCONTRADOS: {filtered.length} CONTENEDORES</span>
          <span>ORDENADO POR ESTADO Y UBICACIÓN</span>
        </div>

        {/* Live location banner for material matches */}
        {cleanQuery && filtered.length > 0 && (
          <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500 text-black font-black rounded-lg text-sm">🎯</span>
              <div>
                <div className="text-sm font-bold text-white">
                  {filtered.length} CONTENEDOR(ES) LOCALIZADO(S) CON "{searchTerm}"
                </div>
                <div className="text-xs text-amber-300/90 mt-0.5">
                  Hacé clic en cualquier ubicación para saltar y resaltar el contenedor en la pila
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {filtered.filter(c => c.estado === 'DEPOSITADO').slice(0, 4).map((c) => (
                <button
                  key={c.codigoISO}
                  onClick={() => onLocateOnMap ? onLocateOnMap(c.calle, c.fila, c.codigoISO) : onOpenRowModal(c.calle, c.fila)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 rounded-lg border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{c.calle} / {c.fila} · Nivel {c.nivel} ({c.codigoISO})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-[#151e27] border border-[#233140] rounded-xl p-8 text-center text-slate-400 font-mono">
            No se encontraron contenedores que coincidan con la búsqueda.
          </div>
        ) : (
          filtered.map((c) => {
            const isDeposited = c.estado === 'DEPOSITADO';
            const matchedMaterial = cleanQuery && c.materiales?.find(
              (m) =>
                m.descripcion.toUpperCase().includes(cleanQuery) ||
                (m.codigo && m.codigo.toUpperCase().includes(cleanQuery))
            );

            return (
              <div
                key={`${c.codigoISO}-${c.fechaIngreso}`}
                className={`bg-[#151e27] border-2 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  matchedMaterial
                    ? 'border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : isDeposited
                    ? 'border-[#233140] hover:border-teal-400'
                    : 'border-slate-800 opacity-60'
                }`}
              >
                {/* Left: Code, Location, Specs */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xl text-white tracking-wider">
                      {c.codigoISO}
                    </span>

                    {matchedMaterial && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500 text-black font-black uppercase flex items-center gap-1 shadow-sm">
                        🎯 CONTIENE: {matchedMaterial.descripcion}
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isDeposited
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {c.estado}
                    </span>

                    <span className="text-xs bg-[#0b1117] text-teal-300 font-mono px-2 py-0.5 rounded border border-[#233140]">
                      {c.naviera}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">{c.tipo}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                    {isDeposited ? (
                      <span className="text-white font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        CALLE: <span className="text-teal-400">{c.calle}</span> · FILA:{' '}
                        <span className="text-teal-400">{c.fila}</span> · NIVEL:{' '}
                        <span className="text-teal-400">{c.nivel}</span>
                      </span>
                    ) : (
                      <span>Retirado de Playa D</span>
                    )}

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Ingreso: {new Date(c.fechaIngreso).toLocaleDateString()}
                    </span>

                    {c.tara && <span>Tara: {c.tara} kg</span>}
                  </div>

                  {/* Materials tags */}
                  {c.materiales && c.materiales.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-mono font-bold text-teal-400 flex items-center gap-1 bg-[#0b1117] px-2 py-0.5 rounded border border-[#233140]">
                        <Package className="w-3 h-3" />
                        {c.materiales.length} ÍTEM(S):
                      </span>
                      {c.materiales.map((m) => {
                        const isMatch = cleanQuery && (
                          m.descripcion.toUpperCase().includes(cleanQuery) ||
                          (m.codigo && m.codigo.toUpperCase().includes(cleanQuery))
                        );
                        return (
                          <span
                            key={m.id}
                            className={`text-xs font-mono px-2 py-0.5 rounded border transition-all ${
                              isMatch
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold ring-1 ring-amber-400/50'
                                : 'bg-[#0b1117] text-slate-300 border-[#233140]'
                            }`}
                          >
                            <strong className={isMatch ? 'text-amber-300' : 'text-teal-300'}>{m.cantidad} {m.unidad}</strong> {m.descripcion}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                {isDeposited && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (onLocateOnMap) {
                          onLocateOnMap(c.calle, c.fila, c.codigoISO);
                        } else {
                          onOpenRowModal(c.calle, c.fila);
                        }
                      }}
                      className="h-10 px-3.5 bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-black border border-amber-500/50 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Abrir corte transversal y resaltar este contenedor en la pila"
                    >
                      <MapPin className="w-4 h-4 text-amber-400" />
                      LOCALIZAR EN MAPA
                    </button>

                    <button
                      onClick={() => onSelectForOperation(c.codigoISO)}
                      className="h-10 px-3 bg-[#1e293b] hover:bg-slate-700 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                      title="Cargar en pantalla de Operación Terex"
                    >
                      OPERAR <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onWithdraw(c.codigoISO)}
                      className="h-10 px-3 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white border border-red-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                      title="Retirar contenedor directamente"
                    >
                      <Trash2 className="w-4 h-4" />
                      RETIRAR
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
