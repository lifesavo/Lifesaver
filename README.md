# LifeSaver

A mobile-first prototype that helps people keep more money: a bill and subscription watchdog, daily local deals, a helper tier for odd jobs, and links out to ride and delivery apps.

**Premium is $9.99/month** and includes the whole money product: auto-cancel, bill negotiation, instant alerts, all deals, and savings goals.

**Lend a Hand is $19.99/month after launch** and includes everything in Premium, plus posting odd jobs (yard work, moving, assembly, cleanup, errands), seeing helper offers, and booking one. Founding members who join the waitlist lock it at **$14.99/month for life**. Helpers in the demo are sample people. The task and offer shape is generic so it can later connect to Work For All, a separate gig platform. LifeSaver does not pretend that network is live.

Free is a short on-ramp: track bills, a few deals, and manual reminders.

Numbers, banks, helpers, and ride prices are **sample data**. No bank is connected. Ride buttons open Uber, Lyft, Uber Eats, and DoorDash on their own sites. LifeSaver is not their partner.

The waitlist is real for this app. Signups, referral codes, and UTM sources are stored in SQLite.

## Run locally

Requires Node.js 22.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

Set `ADMIN_TOKEN` in `.env.local` before using the admin count.

- `/` landing page and waitlist
- `/start` email, ZIP, and mocked account connection
- `/home` savings, alerts, shortcuts
- `/bills` cancel, negotiate, and remind
- `/deals` gas, groceries, and food
- `/savings` history and goals
- `/hand` post a task, see offers, book
- `/rides` sample Uber / Lyft / Uber Eats / DoorDash links
- `/pricing` free, Premium at $9.99 after launch ($7.99 founding), Lend a Hand at $19.99 after launch ($14.99 founding)

On the first onboarding step, **Sample profile** opens the app as `alex@example.com` in 94110.

```bash
npm run lint
npm run build
npm start
```

`npm start` listens on `PORT` or **43123**.

## Waitlist

`POST /api/waitlist`

```json
{
  "email": "you@example.com",
  "zip": "94110",
  "ref": "maya",
  "utm_source": "tiktok",
  "utm_medium": "social",
  "utm_campaign": "launch"
}
```

The landing page reads `?ref=` plus `utm_source`, `utm_medium`, and `utm_campaign` from the URL and sends them with the signup. Known sources are `tiktok`, `instagram`, `x` (also `twitter`), `reddit`, and `facebook`. The first signup for an email keeps its tags. A repeat email is “already on the list.” Every waitlist row is stored with `founding = 1`, which locks Premium at $7.99/month for life and Lend a Hand at $14.99/month for life. After launch, people who did not join pay $9.99 and $19.99. The confirmation includes a referral share message with those locked rates.

`GET /api/waitlist` returns `{ "count": N }` and does not list emails.

Example links:

- `/?utm_source=tiktok&utm_medium=social&ref=creator`
- `/?utm_source=instagram`
- `/?utm_source=x`
- `/?utm_source=reddit`
- `/?utm_source=facebook`

### Admin count

Set `ADMIN_TOKEN`. Then:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:43123/api/admin/waitlist
```

The response is the total plus counts by source and referral code. It does not return email addresses. A missing token is 503. A wrong token is 401.

Rows live in `data/waitlist.sqlite` (gitignored). Set `DATA_DIR` to move the file. Docker uses `/data`.

## Share cards

`/opengraph-image` and `/twitter-image` are generated images. Set `NEXT_PUBLIC_SITE_URL` to the public origin so link previews resolve.

## Fuel

Home opens on the cheapest stations near the member. The browser asks for location and falls back to the ZIP code. `GET /api/fuel` caches each area for five minutes.

Set `GOOGLE_MAPS_API_KEY` to use Google Places API (New) `fuelOptions` prices. Those prices are labeled live. Without a key, LifeSaver loads real stations from OpenStreetMap and labels prices as estimates, or as reported when the map itself has a price tag. Estimated numbers are never described as pump prices.

See [DEPLOY.md](DEPLOY.md) for Render.

## Ask LifeSaver

A chat button sits on every screen. It calls the app's own fuel, ride, travel, deal, bill, budget, and Get a Hand tools. Set `XAI_API_KEY` or `OPENAI_API_KEY` for a live model. With neither key, answers stay in a labeled demo mode. Free accounts get 3 questions a day. Premium and Lend a Hand are unlimited. Turning "my mower won't start" into a helper request is included for Lend a Hand, after short DIY tips.

## LifeSaver Nights

Monthly Girls' Night Out and Guys' Night Out for the seeded US metros. Cities start as Coming soon. There is no date, venue, or deal until someone posts one. Members request a city from `/nights`; requests are ranked by count. Founding waitlist emails can RSVP while an event is still early-access. Everyone else can RSVP after the admin marks it public.

Post a real event from `/admin/nights`, or:

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"cityId":"nyc","kind":"girls","eventDate":"2026-12-12","venue":"A real venue name","deal":"Member dinner price","capacity":40}' \
  http://localhost:43123/api/admin/nights
```

Ride buttons on a posted night are sample Uber and Lyft fares plus public deep links. LifeSaver is not a partner of either company.

## Deploy

Signups only stick on a host with a real disk. This image is that host.

```bash
docker build -t lifesaver .
docker run --rm -p 43123:43123 \
  -e ADMIN_TOKEN="choose-a-long-random-string" \
  -e NEXT_PUBLIC_SITE_URL="https://your-domain.example" \
  -v lifesaver-data:/data \
  lifesaver
```

**Simplest one-click-style option that keeps the waitlist:** [Render](https://render.com) or [Railway](https://railway.com).

1. New Web Service from this repo, using the Dockerfile.
2. Add a persistent disk mounted at `/data`.
3. Set `DATA_DIR=/data`, `ADMIN_TOKEN`, and `NEXT_PUBLIC_SITE_URL` to the service URL.
4. The start command already honors `PORT`.

Vercel’s default serverless filesystem will not keep this SQLite file. Use Render/Railway with a disk, or move the waitlist to Turso or Postgres before a Vercel deploy.

This environment does not include a hosting account, so a public URL is not created from here.

## Rides and delivery

The Rides screen compares **sample** fares and opens public web links:

- Uber: `https://m.uber.com/ul/` with pickup and dropoff coordinates
- Lyft: `https://lyft.com/ride` with the same public deeplink shape
- Uber Eats: `https://www.ubereats.com/`
- DoorDash: `https://www.doordash.com/`

No private API is called. Official partner products such as Uber Affiliate or Uber Direct need approval from those companies. Do not describe the buttons as a partnership.

## Lend a Hand and Work For All

Tasks have a category, title, timing, ZIP, and status. Offers have a helper, price, distance, and time. A booking stores the chosen offer on the task. That model can later post into Work For All without LifeSaver owning the marketplace. The helpers in the prototype are labeled samples.

## Next steps for real integrations

**Plaid (transactions).** Replace the mocked account step with Plaid Link. Read-only. Never ask for a bank password.

**Gas, grocery, and food deals.** Swap samples for a gas-price feed and grocery or affiliate offer APIs. Keep distance and a clear fallback label.

**Stripe.** Bill Premium at $9.99/month after launch, or $7.99/month for life for founding members. Bill Lend a Hand at $19.99/month after launch, or $14.99/month for life for founding members. The demo switch does not charge a card.

**Work For All.** Send booked tasks to that platform when the owner connects it. Keep vetting and payouts there.

**Uber, Lyft, Uber Eats, DoorDash.** Public deep links are already wired. Partner APIs need a business approval before any affiliate tracking or live fare quotes.
