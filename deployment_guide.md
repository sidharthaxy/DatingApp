# Minglex Deployment Guide 🚀

This document outlines the step-by-step process required to transition the Minglex Dating App from a local development environment to a production-ready environment (Render, Neon, R2, etc).

## 1. Environment Variable Migration

In a local setup, you were likely using `.env` files with localhost URLs. For production, these must be strictly defined in your hosting provider's environment settings. 

**Backend (`backend/.env`)**
- `DATABASE_URL`: Must point to your production PostgreSQL (e.g., Neon). *Ensure you append `?pgbouncer=true&connection_limit=1` if using serverless Postgres.*
- `REDIS_URL`: Point to your production Redis instance (e.g., Upstash or Render Redis).
- `JWT_SECRET`: Generate a highly secure, random 64+ character string. DO NOT use the default `secret`.
- `PORT`: Usually automatically supplied by the host (e.g., Render sets this to `10000`).
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Export these from your Production Firebase Project settings.

**Frontend App (`mobile/.env`)**
- `EXPO_PUBLIC_API_URL`: Set this to your deployed backend URL (e.g., `https://api.minglex.com`).
- `EXPO_PUBLIC_SOCKET_URL`: Typically the same as `EXPO_PUBLIC_API_URL`.
- *(Remove any local fallback like `|| 'http://localhost:8000'` in code to prevent silent connection failures).*

**Admin Panel (`admin/.env`)**
- `VITE_API_URL`: Set to your deployed backend (e.g., `https://api.minglex.com/api/v1`).

---

## 2. Backend Deployment (Node.js/Express via Render)

1. Connect your repository to Render and create a new **Web Service**.
2. **Build Command**: `npm install && npx prisma generate && npx tsc`
3. **Start Command**: `npm start` (which should run `node dist/app.js` or `node dist/server.js`).
4. **Pre-Deploy Database Migration**: In your Render settings, under Advanced, specify a pre-deploy script or run `npx prisma db push --accept-data-loss` securely via SSH/Console to sync the DB schema.
5. **WebSocket Configuration**: Ensure your Render service allows WebSocket connections (Render handles this natively on port 443 wss://).

---

## 3. Database Migration (Neon PostgreSQL)

1. Provision a Neon Postgres database.
2. Update the `DATABASE_URL` in your backend deployment.
3. Run `npx prisma db push` to generate the tables on the fresh database.
4. If you have essential seed data (like default `AdminUser` accounts or preset `SubscriptionTier` entries), execute your seed scripts directly via the Neon SQL Editor or a remote Prisma script.

---

## 4. Media Storage Migration (Cloudflare R2 / AWS S3)

Currently, the app relies on local URL paths for media uploads (like `uploads/images/...`). For production, this is volatile because Node instances are ephemeral.

**Required Code Changes:**
1. In `backend/src/controllers/media.controller.ts`, replace the local file system `fs.writeFile` logic with the `aws-sdk` (S3 client).
2. Configure the client to point to Cloudflare R2:
   ```typescript
   import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
   const s3 = new S3Client({
     region: "auto",
     endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
     credentials: {
       accessKeyId: process.env.R2_ACCESS_KEY_ID,
       secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
     },
   });
   ```
3. Update the database to store the absolute CDN URL of the uploaded image rather than the relative `uploads/...` path.

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
