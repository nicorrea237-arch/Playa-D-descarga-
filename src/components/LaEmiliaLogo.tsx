import React, { useState } from 'react';

interface LaEmiliaLogoProps {
  className?: string;
}

export const LaEmiliaLogo: React.FC<LaEmiliaLogoProps> = ({ className = '' }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border border-slate-200 dark:border-slate-700 shadow-sm select-none shrink-0 ${className}`}
      aria-label="La Emilia - Negocios de movilidad"
    >
      {!imgError ? (
        <img
          src="/assets/aistudio/LaEmilia_Logosnuevos2023_Mesa_de_trabajo_1_f2844ede.jpg"
          alt="La Emilia - Negocios de movilidad"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-9 md:h-10 w-auto object-contain block"
        />
      ) : (
        <span className="font-display font-bold text-base md:text-lg tracking-wider uppercase text-slate-900 whitespace-nowrap">
          LA EMILIA
        </span>
      )}
    </div>
  );
};
