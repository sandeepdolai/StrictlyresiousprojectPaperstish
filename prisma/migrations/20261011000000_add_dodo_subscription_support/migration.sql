-- Dodo Payments subscription state and webhook idempotency.
-- Apply with: bunx prisma migrate deploy

ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN "dodoSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "dodoCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionProductId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionPeriodEnd" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "subscriptionEventAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_dodoSubscriptionId_key" ON "User"("dodoSubscriptionId");

CREATE TABLE "DodoWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DodoWebhookEvent_pkey" PRIMARY KEY ("id")
);
