import { validateSale, validatePagination, validateSaleId } from '../utils/salesValidation.js'

export function createSalesController(sales) {
  return {
    async list(req, res) {
      const pagination = validatePagination(req.query)
      res.json({ success: true, sales: await sales.list(pagination), pagination })
    },
    async create(req, res) {
      const sale = await sales.create(validateSale(req.body), req.user.userId)
      res.status(201).json({ success: true, sale })
    },
    async remove(req, res) {
      const removed = await sales.remove(validateSaleId(req.params.id), req.user.userId)
      if (!removed) return res.status(404).json({ success: false, message: 'Sale not found' })
      res.status(204).end()
    },
  }
}
