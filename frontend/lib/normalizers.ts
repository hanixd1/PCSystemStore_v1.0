const MAX_STORAGE_TEXT_LENGTH = 100;

function removeWhitespace(value: string) {
  let compact = '';

  for (const char of value) {
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
      compact += char;
    }
  }

  return compact;
}

function collapseSpaces(value: string) {
  let normalized = value;

  while (normalized.includes('  ')) {
    normalized = normalized.replaceAll('  ', ' ');
  }

  return normalized.trim();
}

export function normalizeLaptopStorage(value: unknown): string {
  const text = String(value || '')
    .slice(0, MAX_STORAGE_TEXT_LENGTH)
    .trim()
    .toUpperCase();

  if (!text) {
    return '';
  }

  const compact = removeWhitespace(text);
  const normalized = compact
    .replaceAll('GBSSD', 'GB SSD')
    .replaceAll('GBHDD', 'GB HDD')
    .replaceAll('TBSSD', 'TB SSD')
    .replaceAll('TBHDD', 'TB HDD')
    .replace(/(\d)(GB|TB)/g, '$1 $2')
    .split('+')
    .map((part) => part.trim())
    .join(' + ');

  return collapseSpaces(normalized);
}
