-- CreateEnum
CREATE TYPE "ProjectMembershipRole" AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- CreateTable
CREATE TABLE "dashboard_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "company" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "legacySupabaseLoginId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "ProjectMembershipRole" NOT NULL DEFAULT 'viewer',
    "canViewProjectInfo" BOOLEAN NOT NULL DEFAULT true,
    "canViewCrew" BOOLEAN NOT NULL DEFAULT false,
    "canEditCrew" BOOLEAN NOT NULL DEFAULT false,
    "canViewDagsplan" BOOLEAN NOT NULL DEFAULT false,
    "canEditDagsplan" BOOLEAN NOT NULL DEFAULT false,
    "canViewCallSheets" BOOLEAN NOT NULL DEFAULT false,
    "canEditCallSheets" BOOLEAN NOT NULL DEFAULT false,
    "canViewSensitiveData" BOOLEAN NOT NULL DEFAULT false,
    "canViewPayroll" BOOLEAN NOT NULL DEFAULT false,
    "canEditPayroll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_users_username_key" ON "dashboard_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_users_legacySupabaseLoginId_key" ON "dashboard_users"("legacySupabaseLoginId");

-- CreateIndex
CREATE INDEX "project_memberships_projectId_idx" ON "project_memberships"("projectId");

-- CreateIndex
CREATE INDEX "project_memberships_userId_idx" ON "project_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_memberships_userId_projectId_key" ON "project_memberships"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "dashboard_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
