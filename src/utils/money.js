// src/utils/money.js
// Simple currency formatting utilities

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '£0';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
