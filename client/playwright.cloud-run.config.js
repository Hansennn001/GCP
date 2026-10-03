import process from 'node:process'
import { defineConfig } from '@playwright/test'
import config from './playwright.config.js'

if (!process.env.CLOUD_RUN_URL || !process.env.CLOUD_RUN_ID_TOKEN) {
  throw new Error('Run scripts/gcp/validate-cloud-run.mjs to supply private Cloud Run authentication')
}

export default defineConfig({
  ...config,
  testIgnore: [],
  workers: 2,
  use: {
    ...config.use,
    baseURL: process.env.CLOUD_RUN_URL,
    extraHTTPHeaders: { 'X-Serverless-Authorization': `Bearer ${process.env.CLOUD_RUN_ID_TOKEN}` },
  },
  webServer: undefined,
})
