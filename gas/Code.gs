/**
 * TEREX PLAYA D - GESTIÓN DE CONTENEDORES (LA EMILIA)
 * Google Apps Script Backend + Validación @laemilia.com.ar + Campo SECTOR
 */

const ALLOWED_DOMAIN = 'laemilia.com.ar';
const CONTAINERS_SHEET_NAME = 'CONTENEDORES';
const MOVEMENTS_SHEET_NAME = 'MOVIMIENTOS';

const CONTAINER_HEADERS = [
  'CODIGO_ISO',
  'CALLE',
  'FILA',
  'NIVEL',
  'TIPO',
  'NAVIERA',
  'SECTOR',
  'TARA_KG',
  'ESTADO',
  'FECHA_INGRESO',
  'FECHA_RETIRO',
  'OBSERVACIONES',
  'OPERADOR',
  'MATERIALES_JSON'
];

const MOVEMENT_HEADERS = [
  'ID',
  'TIPO',
  'CODIGO_ISO',
  'CALLE',
  'FILA',
  'NIVEL_ORIGEN',
  'NIVEL_DESTINO',
  'TIMESTAMP',
  'OPERADOR',
  'MOTIVO'
];

function isAuthorizedLaEmiliaEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return /^[a-z0-9._%+-]+@laemilia\.com\.ar$/.test(clean);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || 'ping');

  if (action === 'verifyUser') {
    const email = String(params.email || '').trim().toLowerCase();
    if (!isAuthorizedLaEmiliaEmail(email)) {
      return jsonResponse({
        status: 'ok',
        authorized: false,
        error: 'Acceso restringido: solo se permiten correos institucionales @' + ALLOWED_DOMAIN
      });
    }
    return jsonResponse({
      status: 'ok',
      authorized: true,
      email: email,
      domain: ALLOWED_DOMAIN
    });
  }

  return jsonResponse({
    status: 'ok',
    service: 'TEREX PLAYA D - LA EMILIA',
    domain: ALLOWED_DOMAIN,
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const data = JSON.parse(rawBody);
    const operatorEmail = String(data.operatorEmail || (data.container && data.container.operador) || '').trim().toLowerCase();

    if (!isAuthorizedLaEmiliaEmail(operatorEmail)) {
      return jsonResponse({
        status: 'error',
        error: 'Acceso denegado: el operador debe pertenecer a @' + ALLOWED_DOMAIN
      });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const containersSheet = getOrCreateSheet(ss, CONTAINERS_SHEET_NAME, CONTAINER_HEADERS);
    const movementsSheet = getOrCreateSheet(ss, MOVEMENTS_SHEET_NAME, MOVEMENT_HEADERS);

    const action = String(data.action || 'syncAll');

    if (action === 'ingreso' && data.container) {
      const c = data.container;
      containersSheet.appendRow([
        c.codigoISO || '',
        c.calle || '',
        c.fila || '',
        c.nivel || '',
        c.tipo || '',
        c.naviera || '',
        c.sector || 'LOGISTICA DE ENTRADA',
        c.tara || '',
        c.estado || 'DEPOSITADO',
        c.fechaIngreso || new Date().toISOString(),
        c.fechaRetiro || '',
        c.observaciones || '',
        c.operador || operatorEmail,
        JSON.stringify(c.materiales || [])
      ]);

      if (data.movement) {
        appendMovementRow(movementsSheet, data.movement, operatorEmail);
      }

      return jsonResponse({ status: 'ok', action: 'ingreso', codigoISO: c.codigoISO });
    }

    if (action === 'retiro' && data.codigoISO) {
      const targetIso = String(data.codigoISO).trim().toUpperCase();
      const fechaRetiro = data.fechaRetiro || new Date().toISOString();
      const lastRow = containersSheet.getLastRow();

      if (lastRow > 1) {
        const range = containersSheet.getRange(2, 1, lastRow - 1, CONTAINER_HEADERS.length);
        const rows = range.getValues();
        let retiredCalle = '';
        let retiredFila = '';
        let retiredNivel = 0;

        for (let i = 0; i < rows.length; i++) {
          const iso = String(rows[i][0] || '').trim().toUpperCase();
          const estado = String(rows[i][8] || '').trim().toUpperCase();
          if (iso === targetIso && estado === 'DEPOSITADO') {
            rows[i][8] = 'RETIRADO';
            rows[i][10] = fechaRetiro;
            retiredCalle = String(rows[i][1] || '');
            retiredFila = String(rows[i][2] || '');
            retiredNivel = Number(rows[i][3] || 0);
            break;
          }
        }

        if (retiredCalle && retiredFila && retiredNivel > 0) {
          for (let j = 0; j < rows.length; j++) {
            const rCalle = String(rows[j][1] || '');
            const rFila = String(rows[j][2] || '');
            const rNivel = Number(rows[j][3] || 0);
            const rEstado = String(rows[j][8] || '').trim().toUpperCase();
            if (rEstado === 'DEPOSITADO' && rCalle === retiredCalle && rFila === retiredFila && rNivel > retiredNivel) {
              rows[j][3] = rNivel - 1;
            }
          }
        }

        range.setValues(rows);
      }

      if (data.movement) {
        appendMovementRow(movementsSheet, data.movement, operatorEmail);
      }
      if (Array.isArray(data.dropMovements)) {
        data.dropMovements.forEach(function(m) {
          appendMovementRow(movementsSheet, m, operatorEmail);
        });
      }

      return jsonResponse({ status: 'ok', action: 'retiro', codigoISO: targetIso });
    }

    const containers = readContainersFromSheet(containersSheet);
    const movements = readMovementsFromSheet(movementsSheet);

    return jsonResponse({
      status: 'ok',
      action: action,
      containers: containers,
      movements: movements
    });
  } catch (err) {
    return jsonResponse({
      status: 'error',
      error: err && err.message ? err.message : String(err)
    });
  } finally {
    lock.releaseLock();
  }
}

function appendMovementRow(sheet, m, fallbackOperator) {
  sheet.appendRow([
    m.id || ('MOV-' + Date.now()),
    m.tipo || '',
    m.codigoISO || '',
    m.calle || '',
    m.fila || '',
    m.nivelOrigen !== null && m.nivelOrigen !== undefined ? m.nivelOrigen : '',
    m.nivelDestino !== null && m.nivelDestino !== undefined ? m.nivelDestino : '',
    m.timestamp || new Date().toISOString(),
    m.operador || fallbackOperator,
    m.motivo || ''
  ]);
}

function readContainersFromSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, CONTAINER_HEADERS.length).getValues();
  return rows
    .filter(function(r) { return String(r[0] || '').trim() !== ''; })
    .map(function(r) {
      let materiales = [];
      try {
        materiales = r[13] ? JSON.parse(String(r[13])) : [];
      } catch (e) {
        materiales = [];
      }
      return {
        codigoISO: String(r[0] || ''),
        calle: String(r[1] || ''),
        fila: String(r[2] || ''),
        nivel: Number(r[3] || 1),
        tipo: String(r[4] || ''),
        naviera: String(r[5] || ''),
        sector: String(r[6] || 'LOGISTICA DE ENTRADA'),
        tara: r[7] !== '' ? Number(r[7]) : undefined,
        estado: String(r[8] || 'DEPOSITADO') === 'RETIRADO' ? 'RETIRADO' : 'DEPOSITADO',
        fechaIngreso: r[9] ? String(r[9]) : new Date().toISOString(),
        fechaRetiro: r[10] ? String(r[10]) : undefined,
        observaciones: r[11] ? String(r[11]) : undefined,
        operador: String(r[12] || ''),
        materiales: materiales
      };
    });
}

function readMovementsFromSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, MOVEMENT_HEADERS.length).getValues();
  return rows
    .filter(function(r) { return String(r[0] || '').trim() !== ''; })
    .map(function(r) {
      return {
        id: String(r[0] || ''),
        tipo: String(r[1] || 'INGRESO'),
        codigoISO: String(r[2] || ''),
        calle: String(r[3] || ''),
        fila: String(r[4] || ''),
        nivelOrigen: r[5] !== '' ? Number(r[5]) : null,
        nivelDestino: r[6] !== '' ? Number(r[6]) : null,
        timestamp: r[7] ? String(r[7]) : new Date().toISOString(),
        operador: String(r[8] || ''),
        motivo: r[9] ? String(r[9]) : undefined
      };
    })
    .reverse();
}
