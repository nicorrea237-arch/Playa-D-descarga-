import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Box,
  Clock,
  Truck,
  CheckCircle2,
  Filter,
  ArrowRight,
  Package,
  Building2
} from 'lucide-react';
import { Container, SECTORES_LA_EMILIA } from '../types/container';

interface SearchTabProps {
  containers: Container[];
  onSelectContainer: (container: Container) => void;
  onQuickRetiro: (codigoISO: string) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  containers,
  onSelectContainer,
  onQuickRetiro,
}) => {
  const [query, setQuery] = useState<string>('');
  const [filterCalle, setFilterCalle] = useState<string>('ALL');
  const [filterSector, setFilterSector] = useState<string>('ALL');
  const [filterEstado, setFilterEstado] = useState<'DEPOSITADO' | 'RETIRADO' | 'ALL'>('DEPOSITADO');

  const filteredContainers = containers.filter((c) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.codigoISO.toLowerCase().includes(q) ||
      c.naviera.toLowerCase().includes(q) ||
      (c.sector || '').toLowerCase().includes(q) ||
      c.calle.toLowerCase().includes(q) ||
      c.fila.toLowerCase().includes(q) ||
      (c.observaciones || '').toLowerCase().includes(q) ||
      (c.materiales &&
        c.materiales.some(
          (m) =>
            m.descripcion.toLowerCase().includes(q) ||
            (m.codigo && m.codigo.toLowerCase().includes(q))
        ));

    const matchesCalle = filterCalle === 'ALL' || c.calle === filterCalle;
    const matchesSector = filterSector === 'ALL' || (c.sector || '') === filterSector;
    const matchesEstado = filterEstado === 'ALL' || c.estado === filterEstado;

    return matchesQuery && matchesCalle && matchesSector && matchesEstado;
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Search Bar & Filters */}
      <div className="bg-[#151e27] border-2 border-[#233140] rounded-xl p-4 md:p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-teal-400" />
          <h2 className="font-mono font-bold text-base md:text-lg text-white tracking-wider">
            BUSCADOR DE INVENTARIO Y CONTENIDO PLAYA D
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código ISO, sector, naviera, material, SKU o fila..."
              className="w-full h-14 bg-[#0b1117] border-2 border-[#233140] focus:border-teal-400 rounded-xl pl-4 pr-10 text-base font-mono text-white placeholder-slate-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono"
              >
                LIMPIAR
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="h-14 bg-[#0b1117] border-2 border-amber-500/40 rounded-xl px-3 text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">TODOS LOS SECTORES</option>
              {SECTORES_LA_EMILIA.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            <select
              value={filterCalle}
              onChange={(e) => setFilterCalle(e.target.value)}
              className="h-14 bg-[#0b1117] border-2 border-[#233140] rounded-xl px-3 text-xs font-mono text-white focus:outline-none focus:border-teal-400"
            >
              <option value="ALL">TODAS LAS CALLES</option>
              <option value="C-01">CALLE C-01</option>
              <option value="C-02">CALLE C-02</option>
              <option value="C-03">CALLE C-03</option>
              <option value="C-04">CALLE C-04</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as 'DEPOSITADO' | 'RETIRADO' | 'ALL')}
              className="h-14 bg-[#0b1117] border-2 border-[#233140] rounded-xl px-3 text-xs font-mono text-white focus:outline-none focus:border-teal-400"
            >
              <option value="DEPOSITADO">EN PLAYA (ACTIVOS)</option>
              <option value="RETIRADO">HISTÓRICO RETIRADOS</option>
              <option value="ALL">TODOS LOS ESTADOS</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span>
              Mostrando <strong className="text-white">{filteredContainers.length}</strong> resultado(s)
              {filterSector !== 'ALL' && (
                <>
                  {' '}en sector <strong className="text-amber-300">{filterSector}</strong>
                </>
              )}
            </span>
          </div>
          {query && <span>Filtro activo: "{query.toUpperCase()}"</span>}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-2.5">
        {filteredContainers.length === 0 ? (
          <div className="bg-[#151e27] border border-[#233140] rounded-xl p-10 text-center font-mono">
            <Box className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <div className="text-slate-300 font-bold">No se encontraron contenedores con ese criterio</div>
            <div className="text-xs text-slate-500 mt-1">
              Verifique el código ISO, sector, material o cambie el filtro de estado a "TODOS LOS ESTADOS".
            </div>
          </div>
        ) : (
          filteredContainers.map((container) => {
            const isDeposited = container.estado === 'DEPOSITADO';
            const totalUnits = container.materiales
              ? container.materiales.reduce((sum, m) => sum + m.cantidad, 0)
              : 0;

            return (
              <div
                key={`${container.codigoISO}-${container.fechaIngreso}`}
                className="bg-[#151e27] hover:bg-[#1a2530] border-2 border-[#233140] rounded-xl p-4 transition-all flex flex-col gap-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-bold text-lg md:text-xl text-white tracking-wider">
                        {container.codigoISO}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isDeposited
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-600'
                        }`}
                      >
                        {container.estado}
                      </span>
                      <span className="text-xs font-mono text-slate-400 bg-[#0b1117] px-2 py-0.5 rounded border border-[#233140]">
                        {container.naviera} · {container.tipo}
                      </span>
                      {container.sector && (
                        <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/50 px-2.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {container.sector}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-teal-400 font-bold">
                        <MapPin className="w-3.5 h-3.5" />
                        {isDeposited
                          ? `UBICACIÓN: ${container.calle} · ${container.fila} · NIVEL ${container.nivel}`
                          : `ÚLTIMA UBICACIÓN: ${container.calle} · ${container.fila}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Ingreso: {new Date(container.fechaIngreso).toLocaleString()}
                      </span>
                    </div>

                    {container.observaciones && (
                      <div className="text-xs text-slate-400 font-mono italic">
                        "{container.observaciones}"
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isDeposited ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectContainer(container)}
                          className="h-11 px-4 bg-[#0f1722] hover:bg-[#1e293b] text-teal-300 border border-teal-500/40 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          VER EN MAPA / MANIFIESTO
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickRetiro(container.codigoISO)}
                          className="h-11 px-4 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          <Truck className="w-4 h-4" />
                          RETIRAR
                        </button>
                      </>
                    ) : (
                      <div className="text-right text-xs font-mono text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-slate-500" />
                        Retirado: {container.fechaRetiro ? new Date(container.fechaRetiro).toLocaleString() : 'Sí'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Materials summary bar inside Search Result Card */}
                {container.materiales && container.materiales.length > 0 && (
                  <div className="bg-[#0b1117] border border-[#233140] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-teal-400 flex items-center gap-1 mr-1">
                        <Package className="w-3.5 h-3.5" />
                        CONTENIDO ({totalUnits} UNID):
                      </span>
                      {container.materiales.map((mat) => (
                        <span
                          key={mat.id}
                          className="text-[11px] font-mono bg-[#151e27] border border-[#233140] text-slate-200 px-2 py-0.5 rounded"
                        >
                          {mat.descripcion} <strong className="text-teal-300">({mat.cantidad} {mat.unidad})</strong>
                        </span>
                      ))}
                    </div>
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
