import { Container, MovementRecord, PlayaConfig } from '../types/container';
import { generateValidIsoCode } from '../utils/iso6346';

const STORAGE_KEY_CONTAINERS = 'terex_playa_d_contenedores_v1';
const STORAGE_KEY_MOVEMENTS = 'terex_playa_d_movimientos_v1';
const STORAGE_KEY_CONFIG = 'terex_playa_d_config_v1';

export const DEFAULT_CONFIG: PlayaConfig = {
  calles: ['C-01', 'C-02', 'C-03', 'C-04'],
  filasPorCalle: 15,
  alturaMaxima: 5,
  maquinaId: 'TEREX TFC 45h - Unidad 04',
  depositoNombre: 'Terminal Logística Playa D'
};

// Realistic initial container fleet to populate the yard on first load
function generateInitialFleet(): Container[] {
  const lines = ['MSC', 'Maersk', 'CMA CGM', 'Hapag-Lloyd', 'Cosco', 'ONE', 'Hamburg Süd'];
  const types = ["40' HC", "20' DC", "40' DC", "40' Reefer", "20' Open Top"];
  const prefixes = ['MSKU', 'MRKU', 'CMAU', 'HLCU', 'COSU', 'ONEY', 'SUDU'];

  const containers: Container[] = [];
  const baseDate = new Date();

  // Create representative stacks in Playa D:
  // C-01: F-01 (3 high), F-02 (5 high - full), F-03 (1 high), F-04 (2 high), F-07 (4 high)
  // C-02: F-01 (2 high), F-05 (4 high), F-06 (1 high), F-10 (3 high)
  // C-03: F-02 (1 high), F-03 (3 high), F-08 (5 high - full), F-12 (2 high)
  // C-04: F-01 (4 high), F-04 (2 high), F-09 (1 high), F-15 (3 high)
  const stackConfigs: { calle: string; fila: string; count: number }[] = [
    { calle: 'C-01', fila: 'F-01', count: 3 },
    { calle: 'C-01', fila: 'F-02', count: 5 }, // Full stack!
    { calle: 'C-01', fila: 'F-03', count: 1 },
    { calle: 'C-01', fila: 'F-04', count: 2 },
    { calle: 'C-01', fila: 'F-07', count: 4 },
    { calle: 'C-01', fila: 'F-11', count: 2 },
    
    { calle: 'C-02', fila: 'F-01', count: 2 },
    { calle: 'C-02', fila: 'F-03', count: 3 },
    { calle: 'C-02', fila: 'F-05', count: 4 },
    { calle: 'C-02', fila: 'F-06', count: 1 },
    { calle: 'C-02', fila: 'F-10', count: 3 },
    { calle: 'C-02', fila: 'F-14', count: 2 },

    { calle: 'C-03', fila: 'F-02', count: 1 },
    { calle: 'C-03', fila: 'F-03', count: 3 },
    { calle: 'C-03', fila: 'F-08', count: 5 }, // Full stack!
    { calle: 'C-03', fila: 'F-12', count: 2 },
    { calle: 'C-03', fila: 'F-15', count: 4 },

    { calle: 'C-04', fila: 'F-01', count: 4 },
    { calle: 'C-04', fila: 'F-04', count: 2 },
    { calle: 'C-04', fila: 'F-09', count: 1 },
    { calle: 'C-04', fila: 'F-13', count: 3 },
    { calle: 'C-04', fila: 'F-15', count: 3 }
  ];

  const sampleMaterialsPool = [
    [
      { id: 'M-1', codigo: 'MOT-250', descripcion: 'Motores 250cc 4T Monocilíndricos', cantidad: 60, unidad: 'PALLETS', pesoKg: 4200 },
      { id: 'M-2', codigo: 'REP-CARB', descripcion: 'Carburadores y Toberas de Admisión', cantidad: 120, unidad: 'CAJAS', pesoKg: 650 }
    ],
    [
      { id: 'M-3', codigo: 'CHA-150', descripcion: 'Chasis Tubulares de Acero Estampado', cantidad: 90, unidad: 'BULTOS', pesoKg: 3800 },
      { id: 'M-4', codigo: 'BASC-02', descripcion: 'Basculantes Traseros Reforzados', cantidad: 180, unidad: 'UNID', pesoKg: 1100 }
    ],
    [
      { id: 'M-5', codigo: 'BAT-LIT', descripcion: 'Baterías de Litio 48V 26Ah Movilidad Eléctrica', cantidad: 200, unidad: 'BULTOS', pesoKg: 2800 },
      { id: 'M-6', codigo: 'CONTR-ECU', descripcion: 'Controladores Electrónicos ECU y Mazo de Cables', cantidad: 50, unidad: 'CAJAS', pesoKg: 400 }
    ],
    [
      { id: 'M-7', codigo: 'NEU-17', descripcion: 'Neumáticos Tubeless 110/80-17 Delanteros', cantidad: 350, unidad: 'UNID', pesoKg: 2100 },
      { id: 'M-8', codigo: 'LLANT-ALUM', descripcion: 'Llantas de Aleación de Aluminio R17', cantidad: 350, unidad: 'UNID', pesoKg: 1950 }
    ],
    [
      { id: 'M-9', codigo: 'LUB-20W50', descripcion: 'Aceite Lubricante 4T 20W-50 Sintético', cantidad: 36, unidad: 'TAMBORES', pesoKg: 7200 }
    ],
    [
      { id: 'M-10', codigo: 'FAR-LED', descripcion: 'Ópticas Delanteras LED y Giros Integrados', cantidad: 450, unidad: 'CAJAS', pesoKg: 980 },
      { id: 'M-11', codigo: 'TAB-DIG', descripcion: 'Tableros Digitales TFT Color', cantidad: 300, unidad: 'CAJAS', pesoKg: 350 }
    ],
    [
      { id: 'M-12', codigo: 'PLA-ABS', descripcion: 'Carenados Plásticos ABS Inyectado Pintados', cantidad: 80, unidad: 'PALLETS', pesoKg: 1600 }
    ],
    [
      { id: 'M-13', codigo: 'CAD-520', descripcion: 'Cadenas de Transmisión Reforzadas 520H con O-Ring', cantidad: 500, unidad: 'UNID', pesoKg: 1150 }
    ]
  ];

  let sampleIdx = 0;
  for (const item of stackConfigs) {
    for (let nivel = 1; nivel <= item.count; nivel++) {
      const line = lines[sampleIdx % lines.length];
      const tipo = types[(sampleIdx + nivel) % types.length];
      const prefix = prefixes[sampleIdx % prefixes.length];
      const codigoISO = generateValidIsoCode(prefix);
      
      const daysAgo = Math.floor(Math.random() * 10) + 1;
      const date = new Date(baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const matSample = sampleMaterialsPool[sampleIdx % sampleMaterialsPool.length];

      containers.push({
        codigoISO,
        calle: item.calle,
        fila: item.fila,
        nivel,
        tipo,
        naviera: line,
        tara: tipo.includes('40') ? 3800 : 2200,
        estado: 'DEPOSITADO',
        fechaIngreso: date.toISOString(),
        observaciones: nivel === item.count && item.count === 5 ? 'Tope de estiba máxima (5/5)' : 'Carga general en regla',
        operador: 'TEREX-01 / Cabina',
        materiales: matSample
      });
      sampleIdx++;
    }
  }

  return containers;
}

function generateInitialMovements(containers: Container[]): MovementRecord[] {
  return containers.map((c, i) => ({
    id: `MOV-INIT-${i + 1000}`,
    tipo: 'INGRESO',
    codigoISO: c.codigoISO,
    calle: c.calle,
    fila: c.fila,
    nivelOrigen: null,
    nivelDestino: c.nivel,
    timestamp: c.fechaIngreso,
    operador: c.operador,
    motivo: 'Estiba inicial registrada'
  }));
}

export class StorageService {
  private static getStoredContainers(): Container[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONTAINERS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading containers from localStorage', e);
    }
    const initial = generateInitialFleet();
    localStorage.setItem(STORAGE_KEY_CONTAINERS, JSON.stringify(initial));
    return initial;
  }

  private static getStoredMovements(containers: Container[]): MovementRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading movements from localStorage', e);
    }
    const initial = generateInitialMovements(containers);
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(initial));
    return initial;
  }

  public static getConfig(): PlayaConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (data) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error reading config', e);
    }
    return DEFAULT_CONFIG;
  }

  public static saveConfig(config: PlayaConfig): void {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }

  public static getPlayaState(): {
    containers: Container[];
    activeContainers: Container[];
    movements: MovementRecord[];
    config: PlayaConfig;
  } {
    const containers = this.getStoredContainers();
    const movements = this.getStoredMovements(containers);
    const config = this.getConfig();
    const activeContainers = containers.filter(c => c.estado === 'DEPOSITADO');

    return {
      containers,
      activeContainers,
      movements,
      config
    };
  }

  public static findActiveByCode(codigoISO: string): Container | undefined {
    const clean = codigoISO.trim().toUpperCase();
    const { activeContainers } = this.getPlayaState();
    return activeContainers.find(c => c.codigoISO.toUpperCase() === clean);
  }

  public static getStack(calle: string, fila: string): Container[] {
    const { activeContainers } = this.getPlayaState();
    return activeContainers
      .filter(c => c.calle === calle && c.fila === fila)
      .sort((a, b) => a.nivel - b.nivel);
  }

  public static getStackHeight(calle: string, fila: string): number {
    return this.getStack(calle, fila).length;
  }

  /**
   * Registers a container entry into Playa D.
   * Calculates the next consecutive available level automatically.
   */
  public static registrarIngreso(data: {
    codigoISO: string;
    calle: string;
    fila: string;
    tipo: string;
    naviera: string;
    tara?: number;
    observaciones?: string;
    operador: string;
    materiales?: import('../types/container').MaterialItem[];
  }): { container: Container; movement: MovementRecord } {
    const cleanCode = data.codigoISO.trim().toUpperCase();
    const state = this.getPlayaState();

    // 1. Business rule: Do not allow if code is already deposited in Playa D
    const existing = state.activeContainers.find(c => c.codigoISO.toUpperCase() === cleanCode);
    if (existing) {
      throw new Error(`El contenedor ${cleanCode} YA se encuentra depositado en ${existing.calle} - ${existing.fila} (Nivel ${existing.nivel}). No se permite duplicar.`);
    }

    // 2. Business rule: Check current occupancy of (calle, fila)
    const currentStack = state.activeContainers
      .filter(c => c.calle === data.calle && c.fila === data.fila)
      .sort((a, b) => a.nivel - b.nivel);

    const currentHeight = currentStack.length;
    if (currentHeight >= state.config.alturaMaxima) {
      throw new Error(`La fila ${data.calle} / ${data.fila} está LLENA (${currentHeight}/${state.config.alturaMaxima} niveles). No es posible apilar más contenedores.`);
    }

    // 3. Automatic level calculation: Next consecutive available level (never leave voids)
    const assignedLevel = currentHeight + 1;
    const nowIso = new Date().toISOString();

    const newContainer: Container = {
      codigoISO: cleanCode,
      calle: data.calle,
      fila: data.fila,
      nivel: assignedLevel,
      tipo: data.tipo || "40' HC",
      naviera: data.naviera || 'Sin Naviera',
      tara: data.tara,
      estado: 'DEPOSITADO',
      fechaIngreso: nowIso,
      observaciones: data.observaciones || '',
      operador: data.operador || 'TEREX-01 / Cabina',
      materiales: data.materiales || []
    };

    const newMovement: MovementRecord = {
      id: `MOV-ING-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'INGRESO',
      codigoISO: cleanCode,
      calle: data.calle,
      fila: data.fila,
      nivelOrigen: null,
      nivelDestino: assignedLevel,
      timestamp: nowIso,
      operador: newContainer.operador,
      motivo: data.observaciones || 'Ingreso y estiba por reach stacker'
    };

    const updatedContainers = [...state.containers, newContainer];
    const updatedMovements = [newMovement, ...state.movements];

    localStorage.setItem(STORAGE_KEY_CONTAINERS, JSON.stringify(updatedContainers));
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(updatedMovements));

    return { container: newContainer, movement: newMovement };
  }

  /**
   * Registers a container withdrawal from any level.
   * Applies Gravity Restacking: all containers above it drop by 1 level.
   * Logs withdrawal and each individual reacomodamiento.
   */
  public static registrarRetiro(
    codigoISO: string,
    motivo = 'Retiro por Terex para despacho',
    operador = 'TEREX-01 / Cabina'
  ): {
    retirado: Container;
    reacomodados: { container: Container; oldLevel: number; newLevel: number }[];
    movements: MovementRecord[];
  } {
    const cleanCode = codigoISO.trim().toUpperCase();
    const state = this.getPlayaState();

    const targetContainer = state.activeContainers.find(c => c.codigoISO.toUpperCase() === cleanCode);
    if (!targetContainer) {
      throw new Error(`El contenedor ${cleanCode} no se encuentra activo o ya fue retirado de Playa D.`);
    }

    const { calle, fila, nivel: levelToWithdraw } = targetContainer;
    const nowIso = new Date().toISOString();

    // Mark as retired
    targetContainer.estado = 'RETIRADO';
    targetContainer.fechaRetiro = nowIso;

    const retiroMovement: MovementRecord = {
      id: `MOV-RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'RETIRO',
      codigoISO: cleanCode,
      calle,
      fila,
      nivelOrigen: levelToWithdraw,
      nivelDestino: null,
      timestamp: nowIso,
      operador,
      motivo
    };

    const newMovements: MovementRecord[] = [retiroMovement];
    const reacomodados: { container: Container; oldLevel: number; newLevel: number }[] = [];

    // Find containers on top of this one in the same stack (calle, fila)
    const superiorContainers = state.activeContainers
      .filter(c => c.calle === calle && c.fila === fila && c.codigoISO !== cleanCode && c.nivel > levelToWithdraw)
      .sort((a, b) => a.nivel - b.nivel);

    // Gravity drop: each drops 1 level
    superiorContainers.forEach((sup) => {
      const oldLevel = sup.nivel;
      const newLevel = oldLevel - 1;
      sup.nivel = newLevel;

      reacomodados.push({
        container: sup,
        oldLevel,
        newLevel
      });

      const reacomodMovement: MovementRecord = {
        id: `MOV-REA-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        tipo: 'REACOMODAMIENTO',
        codigoISO: sup.codigoISO,
        calle,
        fila,
        nivelOrigen: oldLevel,
        nivelDestino: newLevel,
        timestamp: nowIso,
        operador,
        motivo: `Descenso por gravedad tras retiro de ${cleanCode}`
      };

      newMovements.push(reacomodMovement);
    });

    // Update localStorage
    localStorage.setItem(STORAGE_KEY_CONTAINERS, JSON.stringify(state.containers));
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify([...newMovements, ...state.movements]));

    return {
      retirado: targetContainer,
      reacomodados,
      movements: newMovements
    };
  }

  public static resetToDefaultFleet(): void {
    const fleet = generateInitialFleet();
    const movements = generateInitialMovements(fleet);
    localStorage.setItem(STORAGE_KEY_CONTAINERS, JSON.stringify(fleet));
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(DEFAULT_CONFIG));
  }

  public static clearAll(): void {
    localStorage.setItem(STORAGE_KEY_CONTAINERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify([]));
  }
}
