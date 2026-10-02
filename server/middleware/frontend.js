import express from 'express'
import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultFrontendDir = fileURLToPath(new URL('../../client/dist/', import.meta.url))

export function mountFrontend(app, { frontendDir = defaultFrontendDir, production = false } = {}) {
  const indexPath = frontendDir && join(frontendDir, 'index.html')
  if (!indexPath || !existsSync(indexPath)) {
    if (production) throw new Error('React build missing. Run npm --prefix client run build before starting production.')
    return
  }

  // Vite emits content-hashed assets here; do not cache the SPA entry document.
  app.use('/assets', express.static(join(frontendDir, 'assets'), {
    immutable: true, maxAge: '1y', index: false, redirect: false, dotfiles: 'deny',
  }))
  app.use('/assets', (_req, res) => res.status(404).json({ success: false, message: 'Not found' }))
  app.use(express.static(frontendDir, {
    index: false, redirect: false, dotfiles: 'deny',
    setHeaders: res => res.setHeader('Cache-Control', 'no-cache'),
  }))
  app.get('/{*path}', (req, res, next) => {
    // Missing files, dotfiles, and non-HTML clients are not SPA navigation.
    if (extname(req.path) || req.path.split('/').some(part => part.startsWith('.')) || !req.accepts('html')) return next()
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(indexPath)
  })
}
