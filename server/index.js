import app from './app.js'
import env from './config/env.js'

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`Sales Insight Dashboard listening on port ${env.port}`)
})

server.on('error', (error) => {
  console.error(`Unable to start API: ${error.code ?? 'unknown error'}`)
  process.exitCode = 1
})
