export function formatGeorgianDate(dateString: string) {
  const date = new Date(dateString)
  const day = date.getDate()
  const monthIndex = date.getMonth()

  const months = [
    'იანვარი',
    'თებერვალი',
    'მარტი',
    'აპრილი',
    'მაისი',
    'ივნისი',
    'ივლისი',
    'აგვისტო',
    'სექტემბერი',
    'ოქტომბერი',
    'ნოემბერი',
    'დეკემბერი',
  ]

  return `${day} ${months[monthIndex]}`
}

import type { Currency } from '../types/app'

export const currencySymbols: Record<Currency, string> = { GEL: '₾', USD: '$', EUR: '€' }

export function formatCurrency(value: number, currency: Currency = 'GEL', locale = 'ka-GE') {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${currencySymbols[currency]}`
}
