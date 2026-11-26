import { Container, MaterialItem, MovementRecord, PlayaConfig } from '../types/container';

export const DEFAULT_GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbw4Qkd_ti0x1jvyFRHMRx9XM3UtYZi_yX43MplmIMtJ89Wlso4i2S2AfucBoNDRZ_R9VQ/exec';

const LEGACY_GAS_WEB_APP_URL =
  'https://script.google.com/a/macros/laemilia.com.ar/s/AKfycbzvRq2swFuU2QUWJsGM8qWddr0pDjeZK1vLk1h_i35hpeYy3bXnpoYaYf57GqCpyrisUA/exec';

const GAS_URL_STORAGE_KEY = 'la_emilia_playa_d_gas_url_v1';

export type GasConnectionStatus =
  | 'syncing'
  | 'connected'
  | 'auth_required'
  | 'script_outdated'
  | 'error'
  | 'unconfigured';

export interface GasRemoteState {
  containers: Container[];
  movements: MovementRecord[];
  config?: Partial<PlayaConfig>;
}

export interface GasOperationResponse<T = unknown> {
  ok: boolean;
  status: GasConnectionStatus;
  data?: T;
  state?: GasRemoteState;
  errorMessage?: string;
}

function normalizeRemoteState(raw: any): GasRemoteState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const rawContenedores = Array.isArray(raw.contenedores) ? raw.contenedores : [];
  const rawMovimientos = Array.isArray(raw.movimientos) ? raw.movimientos : [];

  const containers: Container[] = rawContenedores.map((c: any) => ({
    codigoISO: String(c.codigoISO || '').trim().toUpperCase(),
    calle: String(c.calle || 'C-01').trim(),
    fila: String(c.fila || 'F-01').trim(),
    nivel: Number(c.nivel || 1),
    tipo: String(c.tipo || "40' HC"),
    naviera: String(c.naviera || 'General'),
    tara: c.tara !== undefined && c.tara !== '' && c.tara !== null ? Number(c.tara) : undefined,
    estado: c.estado === 'RETIRADO' ? 'RETIRADO' : 'DEPOSITADO',
    fechaIngreso: String(c.fechaIngreso || new Date().toISOString()),
    fechaRetiro: c.fechaRetiro ? String(c.fechaRetiro) : undefined,
    observaciones: c.observaciones ? String(c.observaciones) : '',
    operador: String(c.operador || 'TEREX-01 / Cabina'),
    sectores: Array.isArray(c.sectores)
      ? c.sectores.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof c.sectores === 'string' && c.sectores.trim()
      ? c.sectores.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [],
    materiales: Array.isArray(c.materiales) ? c.materiales : [],
  }));

  const movements: MovementRecord[] = rawMovimientos.map((m: any) => ({
    id: String(m.id || `MOV-${Date.now()}`),
    tipo:
      m.tipo === 'RETIRO'
        ? 'RETIRO'
        : m.tipo === 'REACOMODAMIENTO'
        ? 'REACOMODAMIENTO'
        : 'INGRESO',
    codigoISO: String(m.codigoISO || '').trim().toUpperCase(),
    calle: String(m.calle || 'C-01').trim(),
    fila: String(m.fila || 'F-01').trim(),
    nivelOrigen:
      m.nivelOrigen !== null && m.nivelOrigen !== undefined && m.nivelOrigen !== ''
        ? Number(m.nivelOrigen)
        : null,
    nivelDestino:
      m.nivelDestino !== null && m.nivelDestino !== undefined && m.nivelDestino !== ''
        ? Number(m.nivelDestino)
        : null,
    timestamp: String(m.timestamp || new Date().toISOString()),
    operador: String(m.operador || 'TEREX-01 / Cabina'),
    motivo: m.motivo ? String(m.motivo) : '',
  }));

  return {
    containers,
    movements,
    config: raw.config && typeof raw.config === 'object' ? raw.config : undefined,
  };
}

async function parseGasResponse<T = unknown>(response: Response): Promise<GasOperationResponse<T>> {
  const finalUrl = response.url || '';
  if (finalUrl.includes('ServiceLogin') || finalUrl.includes('accounts.google.com')) {
    return {
      ok: false,
      status: 'auth_required',
      errorMessage:
        'La implementación de Google Apps Script exige sesión de Google Workspace (laemilia.com.ar). Para conectar esta pantalla externa, implementá Code.gs con acceso "Cualquier usuario".',
    };
  }

  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      ok: false,
      status: 'error',
      errorMessage: 'Respuesta vacía desde Google Apps Script.',
    };
  }

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    if (trimmed.includes('ServiceLogin') || trimmed.includes('accounts.google.com')) {
      return {
        ok: false,
        status: 'auth_required',
        errorMessage:
          'Google Workspace solicitó inicio de sesión. Cambiá el acceso de la implementación a "Cualquier usuario" en Apps Script.',
      };
    }

    return {
      ok: false,
      status: 'script_outdated',
      errorMessage:
        'El script respondió HTML en lugar de JSON. Pegá el nuevo Code.gs (con doGet ?action=estado y doPost) e implementá una nueva versión.',
    };
  }

  try {
    const json = JSON.parse(trimmed);
    if (json && json.success === false) {
      return {
        ok: false,
        status: 'error',
        errorMessage: json.error || 'Error reportado por Google Apps Script.',
      };
    }

    return {
      ok: true,
      status: 'connected',
      data: (json.result ?? json) as T,
      state: normalizeRemoteState(json.state ?? (json.contenedores ? json : undefined)),
    };
  } catch {
    return {
      ok: false,
      status: 'error',
      errorMessage: 'La respuesta de Google Apps Script no es un JSON válido.',
    };
  }
}

function mapNetworkError<T = unknown>(err: unknown): GasOperationResponse<T> {
  const msg = err instanceof Error ? err.message : String(err);
  const isCorsOrRedirect =
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.includes('CORS');

  if (isCorsOrRedirect) {
    return {
      ok: false,
      status: 'auth_required',
      errorMessage:
        'No se pudo conectar por CORS/acceso restringido al dominio laemilia.com.ar. Verificá en Apps Script: Implementar ➔ Acceso: "Cualquier usuario" y actualizá Code.gs.',
    };
  }

  return {
    ok: false,
    status: 'error',
    errorMessage: msg,
  };
}

export class GasSyncService {
  public static getGasUrl(): string {
    try {
      const saved = localStorage.getItem(GAS_URL_STORAGE_KEY);
      if (saved !== null && saved.trim()) {
        const trimmed = saved.trim();
        if (trimmed === LEGACY_GAS_WEB_APP_URL) {
          localStorage.setItem(GAS_URL_STORAGE_KEY, DEFAULT_GAS_WEB_APP_URL);
          return DEFAULT_GAS_WEB_APP_URL;
        }
        return trimmed;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_GAS_WEB_APP_URL;
  }

  public static setGasUrl(url: string): string {
    const clean = url.trim();
    try {
      localStorage.setItem(GAS_URL_STORAGE_KEY, clean);
    } catch {
      // ignore storage errors
    }
    return clean;
  }

  public static resetGasUrl(): string {
    try {
      localStorage.setItem(GAS_URL_STORAGE_KEY, DEFAULT_GAS_WEB_APP_URL);
    } catch {
      // ignore storage errors
    }
    return DEFAULT_GAS_WEB_APP_URL;
  }

  public static async fetchEstado(customUrl?: string): Promise<GasOperationResponse> {
    const baseUrl = (customUrl ?? this.getGasUrl()).trim();
    if (!baseUrl) {
      return {
        ok: false,
        status: 'unconfigured',
        errorMessage: 'No hay URL de Google Apps Script configurada.',
      };
    }

    try {
      const sep = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${sep}action=estado&_ts=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });
      return await parseGasResponse(response);
    } catch (err) {
      return mapNetworkError(err);
    }
  }

  private static async postAction<T = unknown>(
    payload: Record<string, unknown>,
    customUrl?: string
  ): Promise<GasOperationResponse<T>> {
    const baseUrl = (customUrl ?? this.getGasUrl()).trim();
    if (!baseUrl) {
      return {
        ok: false,
        status: 'unconfigured',
        errorMessage: 'No hay URL de Google Apps Script configurada.',
      };
    }

    try {
      // Usar text/plain evita el preflight CORS OPTIONS que Apps Script no soporta
      const response = await fetch(baseUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      return await parseGasResponse<T>(response);
    } catch (err) {
      return mapNetworkError<T>(err);
    }
  }

  public static async syncIngreso(data: {
    codigoISO: string;
    calle: string;
    fila: string;
    tipo: string;
    naviera: string;
    tara?: number;
    observaciones?: string;
    operador: string;
    sectores?: string[];
    materiales?: MaterialItem[];
  }): Promise<GasOperationResponse> {
    return this.postAction({
      action: 'ingreso',
      data,
    });
  }

  public static async syncRetiro(
    codigoISO: string,
    motivo?: string,
    operador = 'TEREX-01 / Cabina'
  ): Promise<GasOperationResponse> {
    return this.postAction({
      action: 'retiro',
      codigoISO,
      motivo: motivo || 'Retiro operativo desde cabina',
      operador,
    });
  }

  public static async syncClearHistory(): Promise<GasOperationResponse> {
    return this.postAction({
      action: 'clearHistory',
    });
  }

  public static async syncResetDemo(
    containers: Container[],
    movements: MovementRecord[]
  ): Promise<GasOperationResponse> {
    return this.postAction({
      action: 'resetDemo',
      containers,
      movements,
    });
  }
}
