Production close-out checklist

1. Generate Prisma client:
`npm run db:generate`

2. Check production env:
`npm run ops:prod-check`

3. Review pending migrations:
`npm run db:migrate:status`

4. Apply migrations on the real database:
`npm run db:migrate:deploy`

5. Verify billing webhooks:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_BASE_URL`

6. Restart the API process after migrations and env updates.

Notes
- The project now includes billing checkout tables, project app registry, and project app events migrations from March 12, 2026.
- The API enforces security headers, disables `x-powered-by`, trusts the proxy, and limits JSON bodies through `JSON_BODY_LIMIT`.
