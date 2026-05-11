# Project State Document

This document captures the current state of the Dating App project to make future work easier.

## Technology Stack
- **Frontend (Mobile)**: React Native with Expo, Expo Router, Zustand (state management), Lucide React Native (icons), Reanimated/Gesture Handler.
- **Frontend (Admin)**: React, Vite, Tailwind CSS (assumed based on standard stack).
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Cache/PubSub**: Redis (used for matchmaking caching, socket.io pubsub).
- **Real-time**: Socket.IO for chat and typing indicators.

## Current Progress (Roadmap)
We have successfully completed the ENTIRE **21-Day** project roadmap! 🎉

### Recently Completed Milestones:
1. **Day 16: AI Matchmaking & Recommendations**
   - Implemented a 0-100% Compatibility Score algorithm (scoring based on shared interests, relationship goals, age proximity, distance, activity, and subscription tier/boosts).
   - Created `GET /api/v1/recommendations` to fetch daily picks, cached via Redis.
   - Built a background cron job (`dailyRecommendations.job.ts`) that runs at 9 AM to pre-compute recommendations.
   - Wired the Compatibility Score into the Discovery Feed sorting (Relevance sort).
   - Developed the mobile frontend `RecommendationsScreen` with score breakdown rings and bars.

2. **Notifications & Trust & Safety**
   - Integrated FCM token registration (`src/lib/notifications.ts` gracefully falls back if `expo-notifications` is missing).
   - Implemented `ReportSheet.tsx` for reporting users (wired into the chat header and discovery cards).
   - Implemented `AppealScreen` for banned/rejected users with layout redirection rules.

3. **Engagement & Monetization**
   - Analytics (Profile views & likes).
   - Favorites & Wishlists (Full CRUD).
   - Subscription Flow (Razorpay order creation backend + simulated UI frontend).

4. **Day 17: Video Calling & Voice Notes**
   - **WebRTC Video Calls**: Built signaling (`call_initiated`, `webrtc_offer`, `answer`, `ice_candidate`) inside `socket.ts`.
   - Built a frontend `CallScreen` (`mobile/app/call/[id].tsx`) utilizing `react-native-webrtc`.
   - **Voice Notes**: Integrated `expo-av` into `chat/[id].tsx`.
   - Implemented an `AudioPlayer` with a play/pause toggle, visual progress bar, and a dynamic 1.0x / 1.5x / 2.0x playback speed toggle.
   - Enforced a hard 2-minute limit (120s) on voice recordings.

5. **Day 18: Safety Features & Trust Badges**
   - **Database**: Added `EmergencyContact` model mapped to `User` in Prisma schema.
   - **Backend Controllers**: Created `safety.controller.ts` with `/api/v1/safety/emergency-contacts` (CRUD) and `/api/v1/safety/panic` logic (alerts emergency contacts and logs internal warning).
   - **Frontend**: Created the **Safety Center** screen (`safety-center.tsx`) loaded with a large, glowing Panic Button, Emergency Contacts manager, and explanations of Trust Badges. Accessible via the Profile tab.
   - **Trust Badges**: Added dynamic "KYC Verified" and "Active Dater" UI badges directly onto the `ProfileCard` in the Discovery feed.

6. **Day 19: Social Features & Engagement**
   - **Database**: Added `Story`, `StoryView`, `StoryReaction`, `ProfilePrompt`, and `Activity` models.
   - **Backend**: Built `/api/v1/social/*` to handle CRUD operations for stories, profile prompts, and the global activity feed.
   - **Frontend - Stories**: Integrated a horizontal scrolling Stories section directly above the user's Chat list in `chat.tsx`.
   - **Frontend - Activity Feed**: Built the `activity-feed.tsx` screen to show real-time actions happening around the user.
   - **Frontend - Prompts**: Built the `prompts.tsx` screen allowing users to add/delete up to 3 personal icebreaker prompts. Both are accessible via the main profile tab.

7. **Day 20: Analytics Dashboard & Admin Panel**
   - **Database**: Introduced `AdminUser` model and `AdminRole` (SUPER_ADMIN, ADMIN, MODERATOR) in Prisma.
   - **Authentication**: Built `adminAuth.controller.ts` offering Admin Login, Change Password, and Admin Creation flow. Added JWT validation specifically for `admin` accounts.
   - **Admin UI Updates**: Cleaned up the `/admin` React App dashboard. Removed static links, connected dynamic APIs (`localhost:8000/api/v1/admin`), and added real-time stat rendering.
   - **Admin Management**: Only `SUPER_ADMIN` can access the "Admins" tab to create new administrator accounts. Creating a new admin generates a random 16-char alphanumeric password.
   - **Security**: Admins log in using their email and the generated password. `force_password_change` flag redirects them to an obligatory "Change Password" screen before letting them see the dashboard.

8. **Day 21: Final Polish & Deployment Preparation**
   - **Environment Variables**: Removed all hardcoded `http://localhost:8000` fallbacks across the frontend (`mobile`), web frontend (`admin`), and backend configurations. The app now strictly relies on `.env` keys (e.g., `process.env.EXPO_PUBLIC_API_URL`) to ensure secure, correct routing in production environments.
   - **Deployment Documentation**: Authored `deployment_guide.md`, providing a step-by-step roadmap for taking the Node.js backend to Render, configuring Neon PostgreSQL, adapting Cloudflare R2 for media storage, and building the Expo app using EAS.

## Known Technical Details & Patterns
- **API Wrapping**: Frontend uses `apiGet`, `apiPost`, etc., in `lib/api.ts` to automatically handle JWT tokens.
- **State Management**: `useAuthStore` handles user sessions, JWT tokens, and basic user data (tier, profile status). `useChatStore` handles Socket.IO connections and messaging state.
- **Routing**: Expo Router is used for mobile. Protected routes are enforced in `app/_layout.tsx`, handling redirects for unauthenticated users, incomplete profiles, and banned (`REJECTED`) users.
- **Database Schema**: Managed by Prisma. The `User` model is extensive, containing relationships for Swipes, Matches, Messages, Interests, Photos, Subscriptions, Payments, Reports, etc.

## Next Steps
The project roadmap is formally concluded. The repository is prepped and documented for final production deployment.
