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

Open `/?utm_source=tiktok&ref=creator` and join the waitlist. The row should remain after a restart because it is on the disk.
