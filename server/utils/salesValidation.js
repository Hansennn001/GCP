function invalid(message) {
  const error = new Error(message)
  error.status = 400
  throw error
}

export function validateSale(body) {
  const fields = ['sale_date', 'product', 'category', 'region', 'quantity', 'revenue', 'cost']
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !fields.includes(key))) {
    invalid('Invalid sale input')
  }
  const sale = {}
  if (typeof body.sale_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.sale_date) ||
      body.sale_date < '0001-01-01' || !Number.isFinite(Date.parse(body.sale_date)) ||
      new Date(body.sale_date).toISOString().slice(0, 10) !== body.sale_date) invalid('Invalid sale date')
  sale.sale_date = body.sale_date
  for (const key of ['product', 'category', 'region']) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > 150) invalid('Invalid sale text')
    sale[key] = body[key].trim()
  }
  if (!Number.isSafeInteger(body.quantity) || body.quantity < 1) invalid('Invalid quantity')
  sale.quantity = body.quantity
  for (const key of ['revenue', 'cost']) {
    if (!['number', 'string'].includes(typeof body[key])) invalid('Invalid amount')
    if (typeof body[key] === 'number' && (!Number.isFinite(body[key]) || body[key] > Number.MAX_SAFE_INTEGER)) {
      invalid('Use decimal strings for large amounts')
    }
    const value = String(body[key])
    // NUMERIC allows 29 integer digits and 9 fractional digits; preserve decimal strings.
    if (!/^(0|[1-9]\d{0,28})(\.\d{1,9})?$/.test(value)) invalid('Invalid amount')
    sale[key] = value
  }
  return sale
}

export function validatePagination(query) {
  const result = {}
  for (const [key, defaultValue, minimum, maximum] of [['limit', 50, 1, 100], ['offset', 0, 0, 1000000]]) {
    const value = query[key]
    if (value !== undefined && (typeof value !== 'string' || !/^\d{1,7}$/.test(value))) invalid('Invalid pagination')
    const number = value === undefined ? defaultValue : Number(value)
    if (number < minimum || number > maximum) invalid('Invalid pagination')
    result[key] = number
  }
  return result
}

export function validateSaleId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) invalid('Invalid sale ID')
  return id
}
