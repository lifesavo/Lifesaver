# Your Money Life Saver

A mobile-first prototype of one consumer app that saves money two ways: a bill and subscription watchdog, and daily local deals.

Premium is **$9.99/month** and includes everything: auto-cancel, bill negotiation, instant alerts, all deals, and savings goals. Free is a short on-ramp (track bills, a few deals, manual reminders).

The numbers, banks, and prices are **sample data**. Nothing connects to a real bank. The waitlist is real for this app: signups are stored in SQLite.

## Run locally

Requires Node.js 22.

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

- `/` marketing site and waitlist
- `/start` email, ZIP, and mocked account connection
- `/home` savings, upcoming bills, alerts
- `/bills` cancel, negotiate, and remind (demo confirmations)
- `/deals` gas, groceries, and food
- `/savings` history and goals
- `/pricing` free on-ramp vs Premium at $9.99

On the first onboarding step, **Sample profile** drops you into the app as `alex@example.com` in 94110.

```bash
npm run lint
npm run build
npm start
```

`npm start` also listens on port **43123**.

## Waitlist database

`POST /api/waitlist` with `{ "email": "you@example.com", "zip": "94110" }` inserts a row. `GET /api/waitlist` returns `{ "count": N }` and does not list emails.

The file is `data/waitlist.sqlite` (gitignored). Set `DATA_DIR` to put it somewhere else. The same address twice is treated as “already on the list,” not a second row.

## Deploy

The app is a Next.js server. SQLite needs a disk that survives restarts, so run it as a long-lived Node process and mount a volume at `DATA_DIR` (default `/data` in Docker).

```bash
docker build -t your-money-life-saver .
docker run --rm -p 43123:43123 -v ymls-data:/data your-money-life-saver
```

Set `NEXT_PUBLIC_SITE_URL` to the public origin so metadata links resolve.

A serverless host with a read-only filesystem (Vercel’s default) will not keep this SQLite file. Move the waitlist to Turso, Postgres, or another hosted database before that kind of deploy. The UI itself is otherwise a standard `next build` / `next start` app.

## Next steps for real integrations

**Plaid (transactions).** Replace the mocked “connect your accounts” step with [Plaid Link](https://plaid.com/docs/link/). Exchange the public token on the server, store the access token encrypted, and sync transactions. Derive recurring bills, price changes, duplicate charges, free-trial conversions, and “last used” from that stream. Keep the integration read-only. Never ask for a bank password.

**Gas prices.** Swap the sample station list for a gas-price API in the GasBuddy style (or a regional fuel feed). Query by the member’s ZIP, return station, grade, price, and distance, and mark the cheapest. Cache responses so a dashboard refresh is not a new lookup every time.

**Grocery and food deals.** Pull weekly ads and local offers from retailer APIs (for example Kroger) and flyer or affiliate networks. Food deals can come from restaurant partners or offer feeds. Attribute clicks with affiliate ids. Always show distance from the member’s ZIP and label anything that is still a fallback sample.

**Stripe (Premium, $9.99/month).** Add Stripe Checkout and the Customer Portal for a single Premium price of $9.99 per month. Webhooks should set the plan to `premium` or `free`. Gate auto-cancel, negotiation, instant alerts, the full deal list, and savings goals on that plan. The free on-ramp stays: bill tracking, a short deal list, and manual reminders. Do not charge inside this prototype; the upgrade button is a demo switch.

**Alerts.** Once Plaid data is live, send instant Premium alerts (push, email, or SMS) for price hikes, duplicates, trials about to convert, and unused subscriptions. Free members do not get that channel.

**Cancel and negotiate.** Premium actions should open a tracked request, confirm with the member, then contact the merchant (or a negotiation partner). The prototype only stores a confirmation in the browser.
