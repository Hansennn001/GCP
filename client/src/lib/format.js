const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const compactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
const timestamp = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

export const formatCurrency = (value) => currency.format(value)
export const formatCompactCurrency = (value) => compactCurrency.format(value)
export const formatDate = (value) => date.format(new Date(value))
export const formatTimestamp = (value) => `${timestamp.format(new Date(value))} WIB`
export const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value)
