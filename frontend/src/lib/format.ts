export function formatCurrency(price: string | null | undefined): string {
  if (price === null || price === undefined) return ''
  const num = parseFloat(price)
  if (isNaN(num)) return ''
  return `€${num.toFixed(2)}`
}
