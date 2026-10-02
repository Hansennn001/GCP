export function createReportingController(reports) {
  return {
    async summary(_req, res) {
      res.json({ success: true, summary: await reports.summary() })
    },
    async revenueTrend(_req, res) {
      res.json({ success: true, trend: await reports.revenueTrend() })
    },
    async products(_req, res) {
      res.json({ success: true, products: await reports.products() })
    },
    async regions(_req, res) {
      res.json({ success: true, regions: await reports.regions() })
    },
    async topProducts(_req, res) {
      res.json({ success: true, products: await reports.topProducts() })
    },
  }
}
