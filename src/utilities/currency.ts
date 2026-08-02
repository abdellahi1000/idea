export function formatCurrency(amount: number, currencyCode: string): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formattedAmount} ${currencyCode}`;
}
