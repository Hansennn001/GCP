export default function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error)

  const candidate = error.status ?? error.statusCode
  const status = Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500
  let message = status >= 500 ? 'Internal server error' : 'Request failed'

  if (error.type === 'entity.parse.failed') message = 'Invalid JSON body'
  else if (status === 413) message = 'Request body too large'
  else if (status === 415) message = 'Unsupported media type'

  res.status(status).json({ success: false, message })
}
