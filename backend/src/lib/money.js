export function toMinorUnits(rupees) {
  if (typeof rupees !== 'number' || isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

export function toRupees(minorUnits) {
  if (typeof minorUnits !== 'number' || isNaN(minorUnits)) return 0;
  return Math.round(minorUnits) / 100;
}

export function formatRupees(amount) {
  const num = typeof amount === 'number' ? amount : 0;
  return Number(num.toFixed(2));
}
