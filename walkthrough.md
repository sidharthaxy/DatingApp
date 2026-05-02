# Week 1 Completion Walkthrough

Congratulations! The first 7 days of the roadmap are successfully completed. We now have a robust, production-ready foundation.

## Local Environment Tested
- The backend successfully runs locally (`npm run dev`).
- It cleanly connects to the local **PostgreSQL** database.
- It cleanly connects to the **Firebase Auth Emulator** (bypassing real verification).
- It cleanly connects to the local **Redis** instance.
- **`.env` Deployment Ready**: All local environment variables are securely in place, and comments prefixed with `[DEPLOYMENT]` have been added to guide exactly what needs changing when deploying to production (e.g. Neon, AWS ElastiCache, real Firebase Auth).

## Rate Limiting Security
> [!TIP]
> We implemented `express-rate-limit` to protect the APIs from malicious scraping, brute-forcing, and DoS attacks.
- **Global Limit**: `100 requests / 15 minutes` for all endpoints.
- **Strict Auth Limit**: `10 requests / 15 minutes` to protect the `/auth/google` endpoint from brute-force bot attacks.
- **Strict Swipe Limit**: `50 requests / 1 minute` to prevent users from artificially mass-swiping or automating right-swipes.

## Redis Caching Layer (Discovery)
To ensure the app scales natively without hitting the database on every app load:
- `GET /discovery` now aggressively caches user feeds in **Redis** for 5 minutes (`discovery:{userId}:...`).
- When a user updates their preferences (`PUT /users/me`) or makes a swipe (`POST /swipe`), the backend proactively invalidates the Redis cache via `invalidateDiscoveryCache()`, ensuring they don't see stale data or previously-swiped candidates.

## Swagger API Documentation
> [!NOTE]
> All APIs and interfaces are securely documented.
You can view the interactive Swagger API documentation directly via the browser by navigating to `http://localhost:8000/api-docs` when running the backend.

## Edge Cases & Data Validation
- Implemented **Zod middleware** to rigorously validate `req.body` types before hitting any DB logic.
- Applied Zod schemas to `updateMe`, `updateLocation`, and `updateInterests` APIs, preventing invalid strings, out-of-range heights, and strictly validating coordinates (-90 to 90 latitude).

## Automated API Test Suite
> [!TIP]
> We have built a complete, isolated test suite using **Jest** and **Supertest**!
- All tests run against a dedicated `datingapp_test` Postgres database.
- The DB is automatically pushed and wiped between test runs via `src/__tests__/setup.ts`.
- `firebase-admin` is mocked during tests to seamlessly bypass third-party authentication logic.
- **Coverage**: 6 comprehensive test suites (`auth`, `user`, `discovery`, `swipe`, `chat`, `admin`) comprising 21 individual API tests. 
- All 21 tests are passing with a 100% success rate! You can run them anytime using `npm test`.

---

# Week 2: Real-Time & Advanced Features

## Day 8: Real-Time Chat (Socket.IO)

> [!NOTE]
> The chat system has been upgraded from HTTP polling to a highly performant WebSocket architecture.

- **Schema Evolution**: The `Message` table now fully supports `is_read`, `is_edited`, and `is_deleted` flags to allow modern chat experiences.
- **Secure Sockets**: Socket.IO is configured with a strict auth middleware (`io.use`). Any socket attempting to connect without a valid JWT is instantly terminated.
- **Redis Presence Engine**: Complex Socket.IO "Rooms" have been replaced by a lightning-fast Redis layer. When a user connects, their `socket.id` is mapped in Redis (`online_users:${userId}`). This allows us to instantly route messages directly to the recipient's socket if they are online.
- **Advanced Features**: 
  - Real-time `typing` and `stop_typing` events.
  - Real-time `readMessage` events (updating DB and notifying sender).
  - Users can `editMessage` or `deleteMessage` within a strict 5-minute window.
- **Socket Test Suite**: A brand new integration test suite (`src/__tests__/socket.test.ts`) simulates actual client sockets, verifies JWT rejections, and tests instantaneous message delivery across matched users.

## Day 9: Push Notifications (Firebase Cloud Messaging)

> [!NOTE]
> Offline alerting has been added via FCM, ensuring users never miss a match or message when the app is backgrounded.

- **Token Lifecycle API**: Created `POST /api/v1/users/fcm-token` with Zod validation to securely register the user's active device token in the database. 
- **Notification Service**: Centralized `sendPushNotification` logic within `src/services/notification.service.ts` leveraging `firebase-admin`. The service automatically purges stale/expired tokens if Google rejects the payload.
- **Smart Message Triggers**: The Socket.IO server acts intelligently. When a user sends a message, it checks the Redis presence index. If the recipient is disconnected, it immediately defaults to firing an offline Push Notification.
- **Dating Event Triggers**: 
  - `New Match!`: Triggered instantly when two users mutually swipe right.
  - `KYC Status`: Triggered when an admin approves or rejects a user's verification video.
- **Notification Test Suite**: Created an isolated test (`src/__tests__/notification.test.ts`) that mocks `admin.messaging().send()` and verifies that tokens are saved to the DB and triggers execute as expected.

## Day 10: Advanced Discovery & Filters

> [!NOTE]
> The `GET /api/v1/discovery` API has been completely overhauled to support complex user queries, dynamic sorting, and optimized database indexing.

- **Prisma Query Optimization**: Offloaded heavy filtering directly to PostgreSQL to reduce memory overhead:
  - Translated dynamic `min_age` and `max_age` inputs into optimized Date of Birth (`dob`) range queries.
  - Implemented relational filtering for `interests` (matching users by UUID) and `relationship_goals`.
  - Added strict numeric bounding for `min_height` and `max_height`.
  - Created a 24-hour bounding box for `recently_active` users using `last_login_at`.
- **In-Memory Post-Processing Engine**: 
  - After Prisma fetches the tightly filtered dataset, the backend calculates precise **Haversine geographic distances** for all candidates and strips away anyone outside the exact radius.
  - Built a dynamic sorting engine supporting multiple vectors: `DISTANCE` (closest first), `ACTIVITY` (most recently online), `AGE` (youngest first), and `RELEVANCE` (default).
- **Secure Hash Caching**: With thousands of potential filter combinations, caching became a risk (serving wrong results if filters overlap). Fixed this by using Node's native `crypto` module to generate a unique `sha256` hash of the entire JSON query object, creating perfectly isolated Redis cache bins for every unique search request!

## Day 11: Profile Boost & Ranking System

> [!NOTE]
> The ranking algorithm is now live. A scoring engine scores each candidate before sorting, so boosted and new users naturally surface at the top of the discovery feed.

### Ranking Algorithm
The `RELEVANCE` sort now assigns a dynamic score to every candidate before ordering:
| Signal | Points |
|---|---|
| Active boost (`boost_expires_at > now`) | +50 |
| New account (created within 7 days) | +30 |
| Recently active (last login within 24h) | +20 |

Tie-breaking falls back to `created_at DESC`.

### New APIs
- **`POST /api/v1/users/boost`**: Activates a 30-minute profile boost by setting `boost_expires_at` in the DB. Currently **mocked** (no payment validation).
- **`POST /api/v1/analytics/view/:userId`**: Increments a user's `profile_views` counter. Call this whenever a card is shown to another user on the frontend.
- **`GET /api/v1/analytics/me`**: Returns the authenticated user's `profile_views`, `likes_received`, and `dislikes_received`.

### Bug Fixed
Fixed a JavaScript falsy-value bug in `discovery.controller.ts` where coordinates of `0, 0` (equator/prime meridian) were treated as missing location data, causing the distance filter to eliminate all candidates.

---

## 💳 Razorpay Integration Guide (Future Reference)

To wire real payments into the `/boost` endpoint:

### Step 1: Get Your Razorpay API Keys
1. Create an account at [razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys**
3. Generate a **Test Key ID** and **Test Key Secret** for development
4. Store them in `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_here
   ```

### Step 2: Install SDK
```bash
npm install razorpay
```

### Step 3: Backend — Create Order
Replace the current mock in `POST /api/v1/users/boost` with:
```typescript
import Razorpay from 'razorpay';
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

// Create order
const order = await razorpay.orders.create({
  amount: 4900, // ₹49 in paise
  currency: 'INR',
  receipt: `boost_${userId}_${Date.now()}`
});

return res.status(200).json({ success: true, data: { order_id: order.id, amount: order.amount } });
```

### Step 4: Frontend — Launch Payment Sheet
On the React Native side, use `react-native-razorpay`:
```typescript
import RazorpayCheckout from 'react-native-razorpay';

RazorpayCheckout.open({
  key: RAZORPAY_KEY_ID,
  order_id: order.id,
  name: 'MingleX Boost',
  description: '30 minutes of Profile Boost',
  prefill: { email: user.email }
});
```

### Step 5: Backend — Verify Signature & Activate Boost
Create a `POST /api/v1/users/boost/verify` endpoint:
```typescript
import crypto from 'crypto';

const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
const body = `${razorpay_order_id}|${razorpay_payment_id}`;
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
  .update(body)
  .digest('hex');

if (expectedSignature !== razorpay_signature) {
  return res.status(400).json({ error: 'Payment verification failed' });
}

// Activate boost
await prisma.user.update({
  where: { id: userId },
  data: { boost_expires_at: new Date(Date.now() + 30 * 60 * 1000) }
});
```

> [!TIP]
> Always verify the payment signature on the **backend** before activating the boost. Never trust the frontend to confirm payment success.

---

## Day 12: Favorites & Wishlist

> [!NOTE]
> Added systems for saving profiles for later, offering two distinct features: a quick "Favorite" toggle and organized "Wishlists".

### Favorites System
A streamlined way to "star" a profile.
- **Limit**: Max 100 favorites per user to encourage deliberate choices.
- **Notifications**: When a user is favorited, a Push Notification is immediately sent to the target user using the `notification.service.ts`.
- **APIs**:
  - `POST /api/v1/favorites/:targetId` (Toggles the favorite on/off)
  - `GET /api/v1/favorites`

### Wishlist System
Allows users to create custom, named lists (e.g., "Cute people", "Maybe later").
- **Privacy**: Each wishlist has an `is_public` toggle. Private lists are only visible to the owner. Public lists can be shared using a unique URL/ID and viewed by any authenticated user.
- **APIs**:
  - `POST /api/v1/wishlists` (Create a list)
  - `GET /api/v1/wishlists` (Get my lists)
  - `GET /api/v1/wishlists/:id` (Get list & members — checks privacy constraints)
  - `PUT /api/v1/wishlists/:id` (Update list name/privacy)
  - `DELETE /api/v1/wishlists/:id` (Delete list)
  - `POST /api/v1/wishlists/:id/members/:targetId` (Add user to list)
  - `DELETE /api/v1/wishlists/:id/members/:targetId` (Remove user from list)

---

## Day 13: User Reports & Moderation Queue

> [!NOTE]
> Added a comprehensive Trust & Safety layer. Users can report malicious behavior, and an automated system shields the community from bad actors before admins even intervene.

### 1. User Reporting & Rate Limiting
- **Reason Tracking**: Users can report profiles for specific reasons (`INAPPROPRIATE_CONTENT`, `SPAM`, `HARASSMENT`, `SCAM`). 
- **Security**: To prevent malicious targeted reporting campaigns, a database-level rate limit restricts users to submitting **5 reports per day**.

### 2. Auto-Hide Threshold
- A `report_count` tracker is actively maintained on every user profile.
- If a user reaches **10 reports**, the system automatically kicks in and sets their `discover_enabled = false`. This immediately removes them from the discovery feed and prevents further interaction until an Admin reviews the case.

### 3. Admin Moderation Queue
- **Intelligent Sorting**: The `GET /api/v1/admin/reports` endpoint retrieves the moderation queue sorted by `report_count DESC`. Admins always see the most heavily reported (and potentially dangerous) users at the very top.
- Admins can resolve tickets (`POST /api/v1/admin/reports/:reportId/resolve`) with a specific action (`BAN`, `WARN`, or `DISMISS`), leaving an immutable audit trail in `AdminAction`.

### 4. Appeals System
- Users who are banned or auto-hidden can submit a text explanation (`POST /api/v1/appeals`).
- Admins review these via `GET /api/v1/admin/appeals` and can `APPROVE` them, which instantly resets the user's `report_count` to `0` and restores their account visibility.

---

## Day 14: Week 2 Polish & Testing

> [!NOTE]
> Added extensive optimizations to ensure the app is highly secure and capable of handling a massive userbase.

### 1. Database Query Optimization (Prisma B-Tree Indexes)
To ensure the backend runs at blazing speed, we applied strategic `@@index` markers to the database:
- **`User`**: Indexed `created_at`, `last_login_at`, `status`, and `discover_enabled`. This radically speeds up the `GET /discovery` filtering step.
- **`Swipe` & `Match`**: Indexed user IDs to instantly look up if a mutual match exists.
- **`Message`**: Indexed `[from_user, to_user, created_at]` to rapidly pull real-time chat histories.

### 2. High-Performance Image Compression (Sharp)
Switched photo uploads from presigned-S3 URLs to a robust backend pipeline:
- `POST /api/v1/media/upload`: Receives the photo buffer in memory using `multer`.
- Passes the buffer to `sharp`, which resizes images down to a maximum of 1080x1080px to prevent uncompressed 4K uploads from bogging down mobile data.
- Automatically converts photos to the highly optimized `WebP` format before uploading to the S3 bucket, saving up to 60% bandwidth compared to standard JPEGs.

### 3. Security Hardening
- **HTTP Parameter Pollution Protection**: Integrated `hpp` middleware to prevent attackers from sending arrays of parameters in query strings to crash the server.
- **XSS Sanitization Engine**: Created a custom, recursive `xss.middleware.ts` that safely parses all incoming JSON bodies and strips malicious HTML/`<script>` tags, guaranteeing that chat messages and bios cannot execute Cross-Site Scripting payloads on the frontend.
