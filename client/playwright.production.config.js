import { defineConfig } from '@playwright/test'
import config from './playwright.config.js'

export default defineConfig({
  ...config,
  testIgnore: [],
  webServer: {
    command: 'NODE_ENV=production PORT=4173 npm --prefix ../server start',
    url: 'http://127.0.0.1:4173/api/health',
    reuseExistingServer: false,
  },
})
