import process from 'node:process'
import { defineConfig } from '@playwright/test'
import config from './playwright.config.js'

// Start scripts/docker/run-local.mjs separately; tests must not replace it.
export default defineConfig({
  ...config,
  testIgnore: [],
  use: { ...config.use, baseURL: `http://127.0.0.1:${process.env.LOCAL_DOCKER_PORT || 8080}` },
  webServer: undefined,
})
