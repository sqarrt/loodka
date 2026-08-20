// Лудки display formatting: whole amounts print bare ("10"), fractional
// ones print fixed to 2 decimals ("10.50", "0.56") — never a bare "10.5".
export function formatLudki(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
