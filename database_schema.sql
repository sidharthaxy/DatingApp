-- Dating App Database Schema Documentation
-- Generated based on Prisma Schema (PostgreSQL Provider)

-- ############################################################################
-- ENUMS
-- ############################################################################

CREATE TYPE "Status" AS ENUM ('UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY');
CREATE TYPE "RelationshipGoal" AS ENUM (
  'LONG_TERM', 
  'LONG_TERM_OPEN_TO_SHORT', 
  'SHORT_TERM_OPEN_TO_LONG', 
  'FUN_NEW_FRIENDS', 
  'STILL_FIGURING_OUT'
);
CREATE TYPE "InterestedIn" AS ENUM ('MEN', 'WOMEN', 'EVERYONE');
CREATE TYPE "SwipeType" AS ENUM ('LIKE', 'DISLIKE');
CREATE TYPE "AdminActionType" AS ENUM ('APPROVE', 'REJECT', 'WARN', 'BAN');
CREATE TYPE "ReportReason" AS ENUM (
  'INAPPROPRIATE_CONTENT', 
  'SPAM', 
  'HARASSMENT', 
  'SCAM', 
  'OTHER'
);
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM', 'ELITE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "BillingCycle" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');

-- ############################################################################
-- TABLES
-- ############################################################################

-- User Table
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firebase_uid" TEXT UNIQUE,
    "email" TEXT UNIQUE,
    "phone" TEXT UNIQUE,
    "first_name" TEXT,
    "dob" TIMESTAMP,
    "gender" "Gender",
    "bio" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "height_cm" INTEGER,
    "job_title" TEXT,
    "company" TEXT,
    "living_in" TEXT,
    "relationship_goal" "RelationshipGoal",
    "interested_in" "InterestedIn",
    "discover_enabled" BOOLEAN DEFAULT TRUE,
    "is_profile_complete" BOOLEAN DEFAULT FALSE,
    "last_login_at" TIMESTAMP,
    "status" "Status" DEFAULT 'UNDER_REVIEW',
    "kyc_video_url" TEXT,
    "fcm_token" TEXT,
    "boost_expires_at" TIMESTAMP,
    "profile_views" INTEGER DEFAULT 0,
    "report_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "subscription_tier" "SubscriptionTier" DEFAULT 'FREE'
);

-- Photo Table
CREATE TABLE "Photo" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "url" TEXT NOT NULL,
    "version" INTEGER DEFAULT 1,
    "status" "Status" DEFAULT 'UNDER_REVIEW',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interest Table
CREATE TABLE "Interest" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL
);

-- UserInterest Join Table
CREATE TABLE "UserInterest" (
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "interest_id" UUID NOT NULL REFERENCES "Interest"("id"),
    PRIMARY KEY ("user_id", "interest_id")
);

-- Swipe Table
CREATE TABLE "Swipe" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "from_user" UUID NOT NULL REFERENCES "User"("id"),
    "to_user" UUID NOT NULL REFERENCES "User"("id"),
    "type" "SwipeType" NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("from_user", "to_user")
);

-- Message Table
CREATE TABLE "Message" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "from_user" UUID NOT NULL REFERENCES "User"("id"),
    "to_user" UUID NOT NULL REFERENCES "User"("id"),
    "content" TEXT,
    "media_url" TEXT,
    "is_read" BOOLEAN DEFAULT FALSE,
    "is_edited" BOOLEAN DEFAULT FALSE,
    "is_deleted" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AdminAction Table
CREATE TABLE "AdminAction" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "action" "AdminActionType" NOT NULL,
    "reason" TEXT,
    "remark" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match Table
CREATE TABLE "Match" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user1_id" UUID NOT NULL REFERENCES "User"("id"),
    "user2_id" UUID NOT NULL REFERENCES "User"("id"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("user1_id", "user2_id")
);

-- Favorite Table
CREATE TABLE "Favorite" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "target_id" UUID NOT NULL REFERENCES "User"("id"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("user_id", "target_id")
);

-- Wishlist Table
CREATE TABLE "Wishlist" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "name" TEXT NOT NULL,
    "is_public" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WishlistMember Join Table
CREATE TABLE "WishlistMember" (
    "wishlist_id" UUID NOT NULL REFERENCES "Wishlist"("id") ON DELETE CASCADE,
    "target_id" UUID NOT NULL REFERENCES "User"("id"),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("wishlist_id", "target_id")
);

-- Report Table
CREATE TABLE "Report" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL REFERENCES "User"("id"),
    "reported_id" UUID NOT NULL REFERENCES "User"("id"),
    "reason" "ReportReason" NOT NULL,
    "evidence" TEXT,
    "status" "ReportStatus" DEFAULT 'PENDING',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appeal Table
CREATE TABLE "Appeal" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" DEFAULT 'PENDING',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Table
CREATE TABLE "Subscription" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "tier" "SubscriptionTier" NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "status" "SubscriptionStatus" DEFAULT 'ACTIVE',
    "razorpay_subscription_id" TEXT UNIQUE,
    "starts_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Table
CREATE TABLE "Payment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "User"("id"),
    "subscription_id" TEXT,
    "razorpay_order_id" TEXT UNIQUE,
    "razorpay_payment_id" TEXT UNIQUE,
    "razorpay_signature" TEXT,
    "amount" INTEGER NOT NULL, -- in paise
    "currency" TEXT DEFAULT 'INR',
    "status" "PaymentStatus" DEFAULT 'CREATED',
    "tier" "SubscriptionTier" NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ############################################################################
-- INDEXES
-- ############################################################################

CREATE INDEX "idx_user_created_at" ON "User"("created_at");
CREATE INDEX "idx_user_last_login" ON "User"("last_login_at");
CREATE INDEX "idx_user_status" ON "User"("status");
CREATE INDEX "idx_user_discover" ON "User"("discover_enabled");

CREATE INDEX "idx_swipe_users" ON "Swipe"("from_user", "to_user");
CREATE INDEX "idx_message_conversation" ON "Message"("from_user", "to_user", "created_at");
CREATE INDEX "idx_match_users" ON "Match"("user1_id", "user2_id");
CREATE INDEX "idx_report_users" ON "Report"("reporter_id", "reported_id");
CREATE INDEX "idx_subscription_active" ON "Subscription"("user_id", "status");
CREATE INDEX "idx_payment_user" ON "Payment"("user_id");
