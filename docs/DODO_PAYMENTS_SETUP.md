# Dodo Payments setup for Paper Stish

The account card switches between Free and Full Experience only from the subscription state stored by verified Dodo webhooks. Browser return URLs never grant access.

## 1. Create the monthly product

In the Dodo Payments dashboard, create a **subscription** product priced at **USD $4.99 every month**. Copy its product ID.

## 2. Configure Vercel environment variables

Add these server-only environment variables to the Paper Stish Vercel project:

- `DODO_PAYMENTS_API_KEY`: API key from Dodo Payments.
- `DODO_PAYMENTS_PRODUCT_ID`: product ID for the USD $4.99/month subscription.
- `DODO_PAYMENTS_WEBHOOK_KEY`: signing secret for the webhook below.
- `DODO_PAYMENTS_ENVIRONMENT`: `test_mode` while testing; `live_mode` only with live credentials and a live product.

Do not place these values in `NEXT_PUBLIC_*` variables or commit secrets to Git.

## 3. Configure the Dodo webhook

Create a webhook pointing to:

`https://paperstish.online/api/webhooks/dodo`

Subscribe to these event types:

- `subscription.active`
- `subscription.updated`
- `subscription.on_hold`
- `subscription.past_due`
- `subscription.renewed`
- `subscription.plan_changed`
- `subscription.cancelled`
- `subscription.expired`
- `subscription.failed`
- `subscription.paused`
- `subscription.unpaused`

Copy the webhook signing secret to `DODO_PAYMENTS_WEBHOOK_KEY`.

## 4. Apply the database migration

The subscription fields and webhook idempotency table are additive. Before enabling checkout on production, run `bunx prisma migrate deploy` against the production `DATABASE_URL`. The normal build command generates Prisma Client but does not apply production migrations.

Test the full flow with Dodo test credentials first: checkout, `subscription.active`, automatic card switch, customer portal, cancellation, and expiry.
