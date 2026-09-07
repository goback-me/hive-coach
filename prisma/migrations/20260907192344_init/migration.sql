-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COACH', 'CLIENT');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'CHURNED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'SECOND_PAYMENT', 'FULL_PAYMENT', 'RETAINER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'CLICKUP');

-- CreateEnum
CREATE TYPE "ReferralStage" AS ENUM ('INTRODUCED', 'REACHED_OUT', 'IN_CONVERSATION', 'CALL_BOOKED', 'CALL_DONE', 'WON');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignee" TEXT,
    "clientId" TEXT,
    "dueDate" TIMESTAMP(3),
    "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "clickupTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingStepTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'task_alt',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingStepTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientOnboardingStep" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ClientOnboardingStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "videoUrl" TEXT,
    "content" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLessonProgress" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ClientLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "profileVisits" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "metaCampaignId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "thresholdRevenue" DECIMAL(10,2),
    "requiredModuleId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AwardTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAward" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "awardTierId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "clickupApiKey" TEXT,
    "clickupTeamId" TEXT,
    "crmType" TEXT,
    "crmApiKeyOrUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleAccountConnection" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "googleEmail" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleAccountConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSheet" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "spreadsheetName" TEXT,
    "sheetName" TEXT NOT NULL,
    "allColumns" TEXT[],
    "visibleColumns" TEXT[],
    "statusColumn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" TEXT,
    "campaign" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "value" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyValue" DECIMAL(10,2) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactedAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "notes" TEXT,
    "loggedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSpendDaily" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "spend" DECIMAL(10,2) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'meta',

    CONSTRAINT "AdSpendDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueMonthly" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "RevenueMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "note" TEXT,
    "stage" "ReferralStage" NOT NULL DEFAULT 'INTRODUCED',
    "referralLinkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationWeeks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "ClientStatus" NOT NULL DEFAULT 'ONBOARDING',
    "goals" TEXT,
    "description" TEXT,
    "programId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameplanFigmaLink" TEXT,
    "logoUrl" TEXT,
    "metaAdAccountId" TEXT,
    "metaAccessToken" TEXT,
    "clickupListId" TEXT,
    "claritySlug" TEXT,
    "stripeCustomerId" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 45,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "PaymentType",
    "label" TEXT NOT NULL,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedsActionItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "daysDelta" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedsActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_status_dueDate_idx" ON "Task"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientOnboardingStep_clientId_templateId_key" ON "ClientOnboardingStep"("clientId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientLessonProgress_clientId_lessonId_key" ON "ClientLessonProgress"("clientId", "lessonId");

-- CreateIndex
CREATE INDEX "AdCampaign_clientId_idx" ON "AdCampaign"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAward_clientId_awardTierId_key" ON "ClientAward"("clientId", "awardTierId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSheet_clientId_key" ON "ClientSheet"("clientId");

-- CreateIndex
CREATE INDEX "Lead_clientId_createdAt_idx" ON "Lead"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Contract_status_endDate_idx" ON "Contract"("status", "endDate");

-- CreateIndex
CREATE INDEX "ContactLog_clientId_contactedAt_idx" ON "ContactLog"("clientId", "contactedAt");

-- CreateIndex
CREATE INDEX "AdSpendDaily_clientId_date_idx" ON "AdSpendDaily"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpendDaily_clientId_date_source_key" ON "AdSpendDaily"("clientId", "date", "source");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueMonthly_clientId_month_key" ON "RevenueMonthly"("clientId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "User"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");

-- CreateIndex
CREATE INDEX "Referral_stage_idx" ON "Referral"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "Session_clientId_scheduledAt_idx" ON "Session"("clientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ProgressNote_clientId_createdAt_idx" ON "ProgressNote"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_dueDate_idx" ON "Payment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "NeedsActionItem_computedAt_idx" ON "NeedsActionItem"("computedAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOnboardingStep" ADD CONSTRAINT "ClientOnboardingStep_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientOnboardingStep" ADD CONSTRAINT "ClientOnboardingStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingStepTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLessonProgress" ADD CONSTRAINT "ClientLessonProgress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLessonProgress" ADD CONSTRAINT "ClientLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAward" ADD CONSTRAINT "ClientAward_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAward" ADD CONSTRAINT "ClientAward_awardTierId_fkey" FOREIGN KEY ("awardTierId") REFERENCES "AwardTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSheet" ADD CONSTRAINT "ClientSheet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLog" ADD CONSTRAINT "ContactLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpendDaily" ADD CONSTRAINT "AdSpendDaily_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueMonthly" ADD CONSTRAINT "RevenueMonthly_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedsActionItem" ADD CONSTRAINT "NeedsActionItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
