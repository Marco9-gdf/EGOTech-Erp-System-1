export const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ) - UAE Dirham' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$) - Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$) - Australian Dollar' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$) - Singapore Dollar' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥) - Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF (CHF) - Swiss Franc' },
  { code: 'SAR', symbol: '﷼', label: 'SAR (﷼) - Saudi Riyal' },
  { code: 'BRL', symbol: 'R$', label: 'BRL (R$) - Brazilian Real' },
  { code: 'ZAR', symbol: 'R', label: 'ZAR (R) - South African Rand' },
  { code: 'PHP', symbol: '₱', label: 'PHP (₱) - Philippine Peso' },
  { code: 'MYR', symbol: 'RM', label: 'MYR (RM) - Malaysian Ringgit' },
];

export function formatCurrency(amount, symbol = '$') {
  const num = Number(amount) || 0;
  const cleanSymbol = (!symbol || symbol === '?' || symbol.trim() === '') ? '₹' : symbol;
  return `${cleanSymbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
