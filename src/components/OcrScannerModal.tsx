import React, { useState, useEffect } from 'react';
import { Camera, RefreshCw, X, CheckCircle, Zap } from 'lucide-react';
import { REALISTIC_CONTAINER_SAMPLES } from '../utils/iso6346';

interface OcrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (code: string) => void;
}

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [scanning, setScanning] = useState(false);
  const [selectedSample, setSelectedSample] = useState(REALISTIC_CONTAINER_SAMPLES[0]);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setScanning(true);
      setConfidence(0);
      const timer = setTimeout(() => {
        setConfidence(99.4);
        setScanning(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedSample]);

  if (!isOpen) return null;

  const handleCapture = (code: string) => {
    onScanComplete(code);
    onClose();
  };

  const handleCycleSample = () => {
    const nextIdx = (REALISTIC_CONTAINER_SAMPLES.indexOf(selectedSample) + 1) % REALISTIC_CONTAINER_SAMPLES.length;
    setSelectedSample(REALISTIC_CONTAINER_SAMPLES[nextIdx]);
    setScanning(true);
    setConfidence(0);
    setTimeout(() => {
      setConfidence(99.4);
      setScanning(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151e27] border-2 border-[#233140] w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#0f1722] px-5 py-4 border-b border-[#233140] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide text-lg font-mono">
                SIMULADOR OCR TEREX
              </h3>
              <p className="text-xs text-slate-400">
                Cámara IP cabina · Reconocimiento automático de contenedor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 text-xl"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewfinder Camera Simulation */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden border-y border-[#233140]">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
            <div className="border-r border-b border-teal-400"></div>
            <div className="border-r border-b border-teal-400"></div>
            <div className="border-b border-teal-400"></div>
            <div className="border-r border-b border-teal-400"></div>
            <div className="border-r border-b border-teal-400"></div>
            <div className="border-b border-teal-400"></div>
            <div className="border-r border-teal-400"></div>
            <div className="border-r border-teal-400"></div>
            <div></div>
          </div>

          {/* Laser scanning beam */}
          {scanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_#14b8a6] animate-[bounce_1.2s_infinite]" />
          )}

          {/* Container Bounding Box */}
          <div className="relative z-10 border-2 border-teal-400/80 rounded px-6 py-4 bg-teal-950/30 backdrop-blur-[1px] flex flex-col items-center">
            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-teal-300"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-teal-300"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-teal-300"></div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-teal-300"></div>

            <div className="text-[10px] text-teal-400 font-mono tracking-widest uppercase mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> ISO 6346 OCR STENCIL
            </div>
            <div className="text-2xl md:text-3xl font-mono font-bold tracking-widest text-white drop-shadow-md">
              {selectedSample}
            </div>

            {confidence > 0 && (
              <div className="mt-2 text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Confianza: {confidence}%
              </div>
            )}
          </div>

          {/* Telemetry overlay */}
          <div className="absolute bottom-2 left-3 font-mono text-[11px] text-teal-300/80 bg-black/50 px-2 py-1 rounded">
            LENS: 35mm F/2.8 · ISO 400 · EXP: 1/500s
          </div>
          <div className="absolute top-2 right-3 font-mono text-[11px] text-amber-400 bg-black/50 px-2 py-1 rounded flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> REC LIVE
          </div>
        </div>

        {/* Quick sample cycler */}
        <div className="p-4 bg-[#0f1722] border-t border-[#233140] flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>MUESTRAS DISPONIBLES:</span>
            <button
              onClick={handleCycleSample}
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 py-1 px-2 rounded bg-teal-500/10 border border-teal-500/20"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Cambiar código
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {REALISTIC_CONTAINER_SAMPLES.slice(0, 6).map((code) => (
              <button
                key={code}
                onClick={() => {
                  setSelectedSample(code);
                  setScanning(true);
                  setTimeout(() => {
                    setConfidence(99.4);
                    setScanning(false);
                  }, 500);
                }}
                className={`py-2 px-2 text-xs font-mono rounded border transition-all ${
                  selectedSample === code
                    ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold'
                    : 'bg-[#151e27] border-[#233140] text-slate-300 hover:border-slate-500'
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Capture button */}
          <button
            onClick={() => handleCapture(selectedSample)}
            className="w-full h-13 mt-2 bg-teal-500 hover:bg-teal-400 text-black font-bold font-mono text-base rounded-lg shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Camera className="w-5 h-5" />
            CAPTURAR Y TRANSFERIR A TEREX
          </button>
        </div>
      </div>
    </div>
  );
};
