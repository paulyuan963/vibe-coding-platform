export function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').trim();
}

export function tryStringify(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}