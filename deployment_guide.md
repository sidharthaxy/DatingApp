# Minglex Deployment Guide 🚀

This document outlines the step-by-step process required to transition the Minglex Dating App from a local development environment to a production-ready environment (Render, Neon, R2, etc).

## 1. Environment Variable Migration

In a local setup, you were likely using `.env` files with localhost URLs. For production, these must be strictly defined in your hosting provider's environment settings. 

**Backend (`backend/.env`)** — see `backend/.env.example` for the full list
- `NODE_ENV`: `production`. (`development` forces the Firebase Auth emulator.)
- `DATABASE_URL`: Must point to your production PostgreSQL (e.g., Neon). *Ensure you append `?pgbouncer=true&connection_limit=1` if using serverless Postgres.*
- `REDIS_URL`: Point to your production Redis instance (e.g., Upstash or Render Redis).
- `JWT_SECRET`, `REFRESH_JWT_SECRET`: Two different, highly secure random 64+ character strings. DO NOT use the defaults.
- `PORT`: Usually automatically supplied by the host (e.g., Render sets this to `10000`).
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Export these from your Production Firebase Project settings. Remove `FIREBASE_AUTH_EMULATOR_HOST`.
- `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET_NAME`, `STORAGE_REGION`: your S3 / R2 credentials (see section 4).
- `MEDIA_BASE_URL`: the public base URL clients load photos / chat media from (public bucket URL or CDN).
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: live keys.

**Frontend App (`mobile/.env`)** — see `mobile/.env.example`
- `EXPO_PUBLIC_API_URL`: Set this to your deployed backend URL (e.g., `https://api.minglex.com`). The socket connection uses the same URL.
- `EXPO_PUBLIC_USE_EMULATOR`: `false`.

**Admin Panel (`admin/.env`)**
- `VITE_API_URL`: Set to your deployed backend (e.g., `https://api.minglex.com/api/v1`).

---

## 2. Backend Deployment (Node.js/Express via Render)

1. Connect your repository to Render and create a new **Web Service**.
2. **Build Command**: `npm install && npx prisma generate && npx tsc`
3. **Start Command**: `npm start` (which should run `node dist/app.js` or `node dist/server.js`).
4. **Pre-Deploy Database Migration**: In your Render settings, under Advanced, specify a pre-deploy script or run `npx prisma db push` securely via SSH/Console to sync the DB schema.
5. **WebSocket Configuration**: Ensure your Render service allows WebSocket connections (Render handles this natively on port 443 wss://).

---

## 3. Database Migration (Neon PostgreSQL)

1. Provision a Neon Postgres database.
2. Update the `DATABASE_URL` in your backend deployment.
3. Run `npx prisma db push` to generate the tables on the fresh database.
4. If you have essential seed data (like default `AdminUser` accounts or preset `SubscriptionTier` entries), execute your seed scripts directly via the Neon SQL Editor or a remote Prisma script.

---

## 4. Media Storage Migration (Cloudflare R2 / AWS S3)

No code changes are needed. All storage access lives in `backend/src/config/storage.ts` and speaks the S3 API, so the same code runs against MinIO locally and S3 / R2 in production — only the environment changes:

| Variable | Cloudflare R2 example |
| :--- | :--- |
| `STORAGE_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | your R2 API token |
| `STORAGE_BUCKET_NAME` | `minglex-media` |
| `MEDIA_BASE_URL` | public bucket / CDN base for photo and chat media, e.g. `https://pub-xxxx.r2.dev` — links become `<MEDIA_BASE_URL>/<key>` |
| `STORAGE_PUBLIC_URL` | only if clients must reach the S3 API on a different host than the server does (presigned URLs); normally leave unset |

**Access rules.** Profile photos (`users/*/photos/*`) and chat media (`chats/*`) are loaded by plain URL and must be publicly readable. KYC videos (`users/*/kyc/*`) are identity documents and must stay **private** — reviewers receive short-lived signed URLs from the admin API. `npm run storage:init` applies exactly this policy on MinIO; replicate it in your bucket settings.

**Schema.** After pulling this version run `npx prisma db push` once: the `SwipeType` enum gained `SUPER_LIKE`.

---

## 5. Mobile App Build (Expo / EAS)

1. Ensure `app.json` has your final `bundleIdentifier` (iOS) and `package` (Android).
2. Create an `eas.json` file defining your `production` build profile. Ensure `env` variables are correctly injected here if not using Expo Secrets.
3. Run the EAS build command:
   ```bash
   eas build --profile production --platform all
   ```
4. Test the generated `.apk` and TestFlight `.ipa` extensively before final App Store submission to ensure the production `EXPO_PUBLIC_API_URL` resolves correctly.

---

## 6. Admin Panel Deployment (Vite React via Vercel/Render)

1. Host the `admin` folder as a **Static Site** on Render or Vercel.
2. **Build Command**: `npm install && npm run build`
3. **Publish Directory**: `dist`
4. Add `VITE_API_URL` to the environment variables on the hosting platform.

---

## Summary of Hardcoded Removal
As requested, all local references to `http://localhost` have been mapped out and replaced across the frontend and admin panels to strictly read from the environment configuration files. Ensure your `.env` variables are completely populated before running builds!
