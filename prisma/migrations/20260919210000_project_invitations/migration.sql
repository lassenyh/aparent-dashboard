-- AlterTable
ALTER TABLE "dashboard_users" ADD COLUMN     "supabaseAuthId" TEXT;

-- CreateTable
CREATE TABLE "dashboard_sessions" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_sessions_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "project_invitations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviterName" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_rate_limits" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "dashboard_sessions_userId_idx" ON "dashboard_sessions"("userId");

-- CreateIndex
CREATE INDEX "dashboard_sessions_expiresAt_idx" ON "dashboard_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_tokenHash_key" ON "project_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "project_invitations_status_expiresAt_idx" ON "project_invitations"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_projectId_email_key" ON "project_invitations"("projectId", "email");

-- CreateIndex
CREATE INDEX "auth_rate_limits_expiresAt_idx" ON "auth_rate_limits"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_users_supabaseAuthId_key" ON "dashboard_users"("supabaseAuthId");

-- AddForeignKey
ALTER TABLE "dashboard_sessions" ADD CONSTRAINT "dashboard_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dashboard_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
