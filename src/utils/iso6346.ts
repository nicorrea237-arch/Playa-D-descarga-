import { IsoValidationResult } from '../types/container';

// ISO 6346 Letter value mapping (omitting multiples of 11: 11, 22, 33)
const LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38
};

/**
 * Calculates the ISO 6346 check digit for the first 10 characters.
 */
export function calculateIsoCheckDigit(first10Chars: string): number {
  if (first10Chars.length < 10) return -1;
  const chars = first10Chars.toUpperCase().slice(0, 10);
  let totalSum = 0;

  for (let i = 0; i < 10; i++) {
    const char = chars[i];
    let value = 0;
    if (char >= '0' && char <= '9') {
      value = parseInt(char, 10);
    } else if (LETTER_VALUES[char] !== undefined) {
      value = LETTER_VALUES[char];
    } else {
      return -1;
    }
    const weight = Math.pow(2, i);
    totalSum += value * weight;
  }

  const remainder = totalSum % 11;
  // Per ISO 6346 standard, if remainder is 10, check digit is 0
  return remainder === 10 ? 0 : remainder;
}

/**
 * Validates an ISO 6346 container code (11 characters).
 */
export function validateIso6346(rawCode: string): IsoValidationResult {
  const clean = rawCode.trim().toUpperCase().replace(/[\s-]/g, '');
  
  const ownerCode = clean.slice(0, 3);
  const equipmentCategory = clean.length >= 4 ? clean.charAt(3) : '';
  const serialNumber = clean.slice(4, 10);
  const checkDigitChar = clean.length >= 11 ? clean.charAt(10) : '';

  // Basic format check: 4 letters (owner + category) + 6 digits serial + 1 digit check
  const formatRegex = /^[A-Z]{4}\d{6}\d?$/;
  const hasValidFormat = formatRegex.test(clean);

  if (clean.length < 10) {
    return {
      isValid: false,
      expectedCheckDigit: -1,
      actualCheckDigit: null,
      formatted: clean,
      hasValidFormat: false,
      message: `Incompleto (${clean.length}/11 caracteres). Formato esperado: 4 letras + 7 números.`,
      ownerCode,
      equipmentCategory,
      serialNumber
    };
  }

  const expected = calculateIsoCheckDigit(clean.slice(0, 10));

  if (clean.length === 10) {
    return {
      isValid: false,
      expectedCheckDigit: expected,
      actualCheckDigit: null,
      formatted: clean,
      hasValidFormat: true,
      message: `Falta el dígito verificador. Dígito calculado: [${expected}]`,
      ownerCode,
      equipmentCategory,
      serialNumber
    };
  }

  const actual = parseInt(checkDigitChar, 10);
  const isDigitValid = !isNaN(actual) && actual === expected;

  return {
    isValid: isDigitValid,
    expectedCheckDigit: expected,
    actualCheckDigit: isNaN(actual) ? null : actual,
    formatted: clean,
    hasValidFormat: hasValidFormat && clean.length === 11,
    message: isDigitValid
      ? `Dígito verificador válido [${actual}] (ISO 6346 OK)`
      : `Dígito verificador NO coincide: Esperado [${expected}], ingresado [${actual}].`,
    ownerCode,
    equipmentCategory,
    serialNumber
  };
}

/**
 * Generates a valid ISO 6346 code with correct check digit.
 */
export function generateValidIsoCode(prefix = 'MSKU'): string {
  const serial = Math.floor(100000 + Math.random() * 900000).toString();
  const first10 = `${prefix}${serial}`;
  const check = calculateIsoCheckDigit(first10);
  return `${first10}${check}`;
}

export const REALISTIC_CONTAINER_SAMPLES = [
  'MSKU8291034',
  'CMAU5482019',
  'TGHU9182345',
  'SUDU3281902',
  'HLCU7728103',
  'COSU6291040',
  'ONEY3829104',
  'MEDU4819203',
  'ZIMU8392015',
  'TEMU3918206',
  'MRKU9281745',
  'BSIU2918231'
];
