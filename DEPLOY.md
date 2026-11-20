# Deploy LifeSaver on Render

The app is a Docker web service. Waitlist signups live in SQLite, so the service needs a disk.

## One-click blueprint

1. Push this repo somewhere Render can read. Render’s GitHub connector needs a GitHub or GitLab repo. This project currently lives in a private Origin repo, so mirror it to GitHub first if Render cannot see Origin.
2. In Render, choose **New** → **Blueprint** and point it at `render.yaml`.
3. When prompted, set `NEXT_PUBLIC_SITE_URL` to the service URL Render assigns (you can update it after the first deploy and redeploy).
4. Leave `GOOGLE_MAPS_API_KEY` empty to use real OpenStreetMap stations with prices labeled as estimates. Paste a Google Places API (New) key only if you want live `fuelOptions` prices.
5. Render generates `ADMIN_TOKEN`. The disk is mounted at `/data`.

## What the blueprint sets

| Variable | Purpose |
| --- | --- |
| `DATA_DIR=/data` | SQLite file on the persistent disk |
| `ADMIN_TOKEN` | Generated secret for `GET /api/admin/waitlist` |
| `NEXT_PUBLIC_SITE_URL` | Public origin for share-card links |
| `GOOGLE_MAPS_API_KEY` | Optional. Server-side only. Enables live fuel prices |

The Docker start command listens on Render’s `PORT`. Health checks hit `/`.

## After it is up

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://your-service.onrender.com/api/admin/waitlist
```

First-party trial counters (no third-party analytics) are also on that response as `track`, or at `GET /api/admin/stats` with the same token. They count "Try it free" clicks, `/start?trial=1` views, trial sign-ups, and trial Checkout sessions by day and `utm_source` / `ref` in America/Chicago. Signup and checkout totals omit test emails (`trial.verify*`, `*@example.com`, `*@mail.grokbot.com`). The tables store only counts — no IP or email.


Open `/?utm_source=tiktok&ref=creator` and join the waitlist. The row should remain after a restart because it is on the disk.

## Accounts and sign-in

Accounts live in the same SQLite file (`users`, `sessions`, `login_codes`). Sign-up is email + ZIP. Signing in on another device uses a 6-digit code:

- **Device code (always on):** on a signed-in device, Settings → *Show a sign-in code*. Type the email and code on the new device (for example the iPhone home-screen app).
- **Email code (optional):** set both of these and the sign-in screen gets an *Email me a code* button.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key (resend.com) |
| `EMAIL_FROM` | Sender on a domain verified in Resend, e.g. `LifeSaver <hello@golifesaver.com>` |

## Stripe billing (off until every key is set)

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_…` (or `sk_test_…` to try it) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint below |
| `STRIPE_PRICE_PREMIUM_FOUNDING` | Recurring monthly price, $7.99 |
| `STRIPE_PRICE_PREMIUM` | Recurring monthly price, $9.99 |
| `STRIPE_PRICE_HAND_FOUNDING` | Recurring monthly price, $14.99 |
| `STRIPE_PRICE_HAND` | Recurring monthly price, $19.99 |

Webhook endpoint: `https://golifesaver.com/api/billing/webhook`, events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Turn on the Customer Portal in Stripe so *Manage billing* works (this is how people cancel a trial).

The landing-page **Try it free** button starts a 7-day Premium trial (`subscription_data.trial_period_days=7`) and always collects a card (`payment_method_collection=always`). After 7 days Stripe charges the founding or regular Premium price unless they cancel in the Customer Portal.

Founding price: anyone whose account was created before billing opened, or whose email is on the waitlist. While any key is missing, plan buttons save founding-rate interest (`plan_interest` table) and nothing is charged.
