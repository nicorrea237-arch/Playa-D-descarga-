export interface MaterialItem {
  id: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  unidad: string; // e.g. 'PALLETS', 'BULTOS', 'UNID', 'CAJAS', 'TAMBORES', 'KG'
  pesoKg?: number;
}

export interface Container {
  codigoISO: string;
  calle: string; // e.g. 'C-01'
  fila: string;  // e.g. 'F-01'
  nivel: number; // 1 to 5
  tipo: string;  // e.g. "40' HC", "20' DC"
  naviera: string; // e.g. 'MSC', 'Maersk'
  tara?: number;
  estado: 'DEPOSITADO' | 'RETIRADO';
  fechaIngreso: string;
  fechaRetiro?: string;
  observaciones?: string;
  operador: string;
  materiales?: MaterialItem[];
}

export type MovementType = 'INGRESO' | 'RETIRO' | 'REACOMODAMIENTO';

export interface MovementRecord {
  id: string;
  tipo: MovementType;
  codigoISO: string;
  calle: string;
  fila: string;
  nivelOrigen: number | null;
  nivelDestino: number | null;
  timestamp: string;
  operador: string;
  motivo?: string;
}

export interface PlayaConfig {
  calles: string[];
  filasPorCalle: number;
  alturaMaxima: number;
  maquinaId: string;
  depositoNombre: string;
}

export interface IsoValidationResult {
  isValid: boolean;
  expectedCheckDigit: number;
  actualCheckDigit: number | null;
  formatted: string;
  hasValidFormat: boolean;
  message: string;
  ownerCode: string;
  equipmentCategory: string;
  serialNumber: string;
}
