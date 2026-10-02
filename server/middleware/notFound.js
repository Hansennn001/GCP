export default function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'Not found' })
}
