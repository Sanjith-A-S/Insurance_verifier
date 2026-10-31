export function normalizeRegistration(reg) {
  if (!reg || typeof reg !== 'string') return '';
  return reg.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeVin(vin) {
  if (!vin || typeof vin !== 'string') return '';
  return vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export function levenshteinDistance(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, () =>
    new Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}
