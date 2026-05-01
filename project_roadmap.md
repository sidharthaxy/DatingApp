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
- [ ] Report System (reasons, evidence, rate limiting)
- [ ] Moderation Queue (Highest reports first, Auto-hide at 10 reports)
- [ ] Appeal System

### 🗓️ DAY 14 — Week 2 Polish & Testing
- [ ] DB Query optimization
- [ ] Image compression (Sharp)
- [ ] Security hardening (CSRF, XSS, Rate limiting)

---

## 📅 WEEK 3 — PRODUCTION READY & SCALING

### 🗓️ DAY 15 — Subscription & Payments (Razorpay)
- [ ] Razorpay Integration (Weekly, Monthly, Quarterly, Yearly)
- [ ] Free vs Premium vs Elite features
- [ ] Webhook handling

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

### Backend Status
- **Core**: Node.js/Express setup complete. Prisma ORM configured.
- **Auth**: Google login works with proper JWT refresh logic. JWT verification middleware ready. Redis blacklist for logout implemented. `last_login_at` and `is_profile_complete` updated in DB.
- **Database**: Initial schema created with User, Photo, Interest, Swipe, Message, and AdminAction tables.
- **User APIs**: Full onboarding APIs (`/me`, `/location`, `/interests`) completed with profile completion logic and age validation.
- **Media APIs**: Photo & KYC upload workflows completed, including signed S3 URLs, size/type validation, DB tracking, and max photo limits.
- **Discovery**: Discovery feed successfully gated for users who lack a complete profile or missing KYC.

### Frontend Status (Mobile)
- **UI**: Basic shells for Login, Onboarding, Discovery (Swiping), KYC, and Chat are present.
- **State Management**: Zustand store implemented for Auth.

### Next Immediate Steps
1.  Implement Socket.IO server with auth middleware.
2.  Store online users in Redis.
3.  Set up Private rooms (1:1).
