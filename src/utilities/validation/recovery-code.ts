/** Strips anything that isn't A-Z/0-9, uppercases, and caps at 6 characters -
 * applied on every keystroke so spaces/emojis/symbols/lowercase never
 * appear in the field to begin with. */
export function sanitizeRecoveryCodeInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/** Format rule: exactly 6 characters, exactly 2 letters, exactly 4 digits,
 * any order. Only meaningful to call once the field is at full length -
 * partial input is simply "not finished yet", not an error. */
export function getRecoveryCodeFormatError(code: string): string | null {
  if (code.length < 6) return null;

  const letters = (code.match(/[A-Z]/g) ?? []).length;
  const digits = (code.match(/[0-9]/g) ?? []).length;

  if (letters !== 2 || digits !== 4) {
    return 'Code must contain exactly 2 letters and 4 digits.';
  }
  return null;
}

export function isValidRecoveryCode(code: string): boolean {
  return code.length === 6 && getRecoveryCodeFormatError(code) === null;
}
