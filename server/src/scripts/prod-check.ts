import 'dotenv/config'

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
]

const optionalRecommended = [
  'APP_BASE_URL',
  'CORS_ORIGINS',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
]

const missingRequired = required.filter(key => !process.env[key])
const missingRecommended = optionalRecommended.filter(key => !process.env[key])

if (missingRequired.length) {
  console.error('[Prod Check] Missing required env vars:', missingRequired.join(', '))
  process.exit(1)
}

if (missingRecommended.length) {
  console.warn('[Prod Check] Missing recommended env vars:', missingRecommended.join(', '))
}

console.log('[Prod Check] OK')
