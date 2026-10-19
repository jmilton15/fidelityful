/**
 * Formateo estándar en español (es-ES) para Moneda (€) y Puntos de Fidelidad
 */

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(num)) return '0,00 €';
  return num.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPoints(points: number | string | null | undefined): string {
  const num = typeof points === 'string' ? parseFloat(points) : Number(points ?? 0);
  if (isNaN(num)) return '0 pts';
  return `${Math.round(num).toLocaleString('es-ES')} pts`;
}

export function formatPointsRaw(points: number | string | null | undefined): string {
  const num = typeof points === 'string' ? parseFloat(points) : Number(points ?? 0);
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('es-ES');
}
