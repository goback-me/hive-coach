-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW_LEAD', 'CHASE_UP', 'CLIENT_CONTACTED', 'WON', 'LOST', 'DISQUALIFIED');

-- AlterTable
ALTER TABLE "ClientSheet" ADD COLUMN     "statusMapping" JSONB;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "adset" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "externalKey" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "raw" JSONB,
ADD COLUMN     "statusManuallySetAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'NEW_LEAD';

-- CreateIndex
CREATE INDEX "Lead_clientId_externalKey_idx" ON "Lead"("clientId", "externalKey");

