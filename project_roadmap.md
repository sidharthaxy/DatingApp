# MingleX Project Roadmap & Status

## Project Overview
MingleX is a premium dating application with high-fidelity design, KYC verification, and AI-driven matchmaking. This roadmap outlines the 21-day development plan for the Beta release.

---

## 📅 WEEK 1 — FOUNDATION & CORE LOGIC

### 🗓️ DAY 1 — Backend Core + Auth (Production Ready)
- [x] Setup full backend (Node.js, Express, Prisma, PostgreSQL)
- [x] Implement `/auth/google` (Login works with refresh token logic)
- [x] JWT + Refresh token
- [x] Auth middleware (JWT verification with Redis blacklist)
- [x] Store `firebase_uid` in DB
- [x] Add `last_login_at` to User model
- [x] Add `is_profile_complete` (BOOLEAN)

### 🗓️ DAY 2 — User Onboarding (CRITICAL FLOW)
- [x] Build full onboarding APIs:
    - `PUT /users/me`
    - `POST /users/location`
    - `POST /users/interests`
- [x] Logic: Calculate age from DOB
- [x] Logic: Mark profile complete only if: Name, DOB, At least 1 photo, Interests selected

### 🗓️ DAY 3 — Media + KYC (Must for Trust)
- [x] Photo Upload API: `/media/upload-photo` (Max 9 photos, versioned paths)
- [x] KYC API: `/media/upload-kyc` (Status: UNDER_REVIEW)
- [x] Image/Video size/type validation
- [x] Discovery Gating: Prevent discovery if no photo or KYC not uploaded

### 🗓️ DAY 4 — Admin Panel APIs (Moderation System)
- [x] Admin APIs:
    - `GET /admin/users?status=UNDER_REVIEW`
    - `GET /admin/users/:id`
    - `POST /admin/users/:id/approve`
    - `POST /admin/users/:id/reject`
- [x] Rejection reasons enum & admin remarks
- [x] Logic: APPROVED → visible in discovery, REJECTED → blocked

### 🗓️ DAY 5 — Discovery + Swipe (Core Dating Logic)
- [x] Discovery API: `GET /discovery` (Filter by status=APPROVED, not blocked, not swiped, distance, gender)
- [x] Swipe API: `POST /swipe` (Prevent duplicate/self swipe)
- [x] Match Logic: Detect mutual likes and create match

### 🗓️ DAY 6 — Chat System (Basic but Working)
- [x] APIs:
    - `POST /chat/send`
    - `GET /chat/messages/:userId`
    - `GET /chat/conversations`
- [x] Rules: Only matched users can chat, blocked users cannot chat
- [x] Simple polling/persistence (Text only for beta)

### 🗓️ DAY 7 — Polish + Stability + Testing
- [x] Pagination for all list endpoints
- [x] Error handling & Edge cases
- [x] Redis caching for discovery
- [x] Rate limiting
- [x] Swagger documentation

---

## 📅 WEEK 2 — REAL-TIME & ADVANCED FEATURES

### 🗓️ DAY 8 — Real-Time Chat with Socket.IO
- [x] Socket.IO server with auth middleware
- [x] Online users in Redis
- [x] Private rooms (1:1)
- [x] Typing indicators, Read receipts, Online status
- [x] Edit/Delete message (5min window)

### 🗓️ DAY 9 — Push Notifications (FCM)
- [x] FCM Setup for iOS/Android
- [x] Token management in DB
- [x] Triggers: Match, Message, KYC update, Like/Favorite

### 🗓️ DAY 10 — Advanced Discovery & Filters
- [x] Filters: Age (18-100), Distance (1km-Worldwide), Interests, Relationship goals, Height, Recently active
- [x] Sorting: Distance, Activity, Age, Relevance

### 🗓️ DAY 11 — Profile Boost & Ranking System
- [x] Boost Feature (Razorpay integration prep)
- [x] Ranking Algorithm: Completeness, Boosted (+50%), New (+30%), Active (+20%)
- [x] Analytics: Profile views, Like/Dislike ratio

### 🗓️ DAY 12 — Favorites & Wishlist
- [x] Favorites System (Max 100, Online notifications)
- [x] Wishlist Feature (Custom lists, sharing, privacy)

### 🗓️ DAY 13 — User Reports & Moderation Queue
- [x] Report System (reasons, evidence, rate limiting)
- [x] Moderation Queue (Highest reports first, Auto-hide at 10 reports)
- [x] Appeal System

### 🗓️ DAY 14 — Week 2 Polish & Testing
- [x] DB Query optimization
- [x] Image compression (Sharp)
- [x] Security hardening (CSRF, XSS, Rate limiting)

---

## 📅 WEEK 3 — PRODUCTION READY & SCALING

### 🗓️ DAY 15 — Subscription & Payments (Razorpay)
- [x] Razorpay Integration (Weekly, Monthly, Quarterly, Yearly)
- [x] Free vs Premium vs Elite features
- [x] Webhook handling
- [x] Frontend subscription page with plan comparison

### 🗓️ DAY 16 — AI Matchmaking & Recommendations
- [ ] Compatibility Score (0-100%)
- [ ] Daily Recommendations (9 AM)
- [ ] Smart Swipe Queue prioritization

### 🗓️ DAY 17 — Video Calling & Voice Notes
- [ ] WebRTC 1-on-1 video calls
- [ ] Voice Notes (2 min limit, Waveform, Playback speed)

### 🗓️ DAY 18 — Safety Features & Trust Badges
- [ ] Panic button & Emergency contacts
- [ ] Trust Badges (KYC, Verified, Active dater, etc.)
- [ ] Safety Center resources

### 🗓️ DAY 19 — Social Features & Engagement
- [ ] Stories (24h expiry, reactions, views)
- [ ] Icebreakers & Prompts
- [ ] Activity Feed

### 🗓️ DAY 20 — Analytics Dashboard & Admin Panel
- [ ] Admin Stats (User growth, Swipe/Match stats, Revenue)
- [ ] Content Moderation (AI NSFW detection, Bulk approval)

### 🗓️ DAY 21 — Final Polish, Deployment & Documentation
- [ ] Deployment to Render/Neon/R2
- [ ] Sentry & Monitoring setup
- [ ] Complete API Docs & Guides

---

## 📊 CURRENT STATUS SUMMARY

### Architecture & Core
- **Framework**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL (via Prisma ORM). Advanced B-Tree indexing applied for performance scaling.
- **Caching & Real-time**: Redis deployed for rate-limiting, token blacklisting, and future queuing.
- **Security**: Hardened with Helmet, CORS, Rate Limiting, HTTP Parameter Pollution (`hpp`), and custom XSS-Sanitization middleware.

### Authentication & Profiles
- **Authentication**: Firebase Admin SDK integrated for Google Sign-in. Secure HTTP-only refresh tokens and Bearer access tokens implemented.
- **Profile Onboarding**: Modular REST endpoints to capture bio, gender, preferences, and interests. Automatic `is_profile_complete` computation.
- **Media Management**: High-performance image processing using `multer` and `sharp`. Automatically resizes uploads to 1080x1080 and compresses to WebP. Presigned URLs used for large KYC video uploads.

### Discovery & Swiping
- **Algorithm**: Complex Elo-based ranking system. Computes scores based on profile completeness, mutual interests, activity recency, and past swipe velocity.
- **Geospatial & Filtering**: Implemented Haversine formula for strict distance filtering. Filters users by age, gender preference, and distance.
- **Swipe Engine**: Rate-limited matching logic. Detects mutual swipes and instantly creates a `Match` record. Records stored efficiently in the `Swipe` table.

### Messaging & Social
- **Chat System**: REST API for retrieving match history and paginated direct messages. Pre-optimized for future WebSocket integration.
- **Wishlists & Favorites**: Privacy-aware custom wishlists allowing users to share categorized groups of profiles. Standard robust Favorites system.

### Trust & Safety (Moderation)
- **User Reporting**: Granular reporting API with a strict 5-reports-per-day rate limit to prevent abuse.
- **Auto-Hide Defense**: Automated threshold triggers a `discover_enabled = false` flag on any profile receiving 10+ reports, instantly hiding them.
- **Admin Dashboard**: Moderation queue sorting by highest report counts. Admins can permanently BAN, WARN, or DISMISS cases.
- **Appeals**: Banned users can submit an appeal text. Admin approvals instantly restore account standing.

### Infrastructure & QA
- **Testing**: Comprehensive automated test suites (`Jest`, `Supertest`) covering Auth, Discovery, Moderation, and Media. All test suites passing.
- **Environment**: Setup configurations (`.env.test`, `.env`) and database synchronization commands ready for CI/CD.

### Frontend Status (Mobile)
- **UI**: Basic shells for Login, Onboarding, Discovery (Swiping), KYC, and Chat are present.
- **State Management**: Zustand store implemented for Auth.

### Next Immediate Steps
1.  Implement Socket.IO server with auth middleware.
2.  Store online users in Redis.
3.  Set up Private rooms (1:1).
