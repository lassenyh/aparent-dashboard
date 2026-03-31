-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('day', 'hour');

-- CreateEnum
CREATE TYPE "DietaryPreference" AS ENUM ('none', 'vegetarian', 'vegan');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "CallSheetStatus" AS ENUM ('draft', 'final');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgNumber" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultRate" DECIMAL(10,2),
    "rateType" "RateType" NOT NULL DEFAULT 'day',
    "dietaryPreference" "DietaryPreference" NOT NULL DEFAULT 'none',
    "allergies" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalTitle" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "agencyId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCrew" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleOverride" TEXT,
    "rateOverride" DECIMAL(10,2),
    "rateTypeOverride" "RateType",
    "notes" TEXT,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollList" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Lønningsliste',
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRow" (
    "id" TEXT NOT NULL,
    "payrollListId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSectionHeader" BOOLEAN NOT NULL DEFAULT false,
    "sectionTitle" TEXT,
    "personId" TEXT,
    "fullName" TEXT NOT NULL,
    "projectLabel" TEXT NOT NULL,
    "address" TEXT,
    "honorar" DECIMAL(10,2),
    "includesHolidayPay" BOOLEAN NOT NULL DEFAULT false,
    "nationalId" TEXT,
    "bankAccount" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "status" TEXT,

    CONSTRAINT "PayrollRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCrewList" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCrewList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCrewListMember" (
    "id" TEXT NOT NULL,
    "projectCrewListId" TEXT NOT NULL,
    "projectCrewId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectCrewListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSheet" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "location" TEXT,
    "generalCallTime" TEXT,
    "notes" TEXT,
    "status" "CallSheetStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSheetCrew" (
    "id" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "fullNameSnapshot" TEXT NOT NULL,
    "roleSnapshot" TEXT NOT NULL,
    "phoneSnapshot" TEXT,
    "emailSnapshot" TEXT,
    "dietaryPreferenceSnapshot" "DietaryPreference" NOT NULL DEFAULT 'none',
    "allergiesSnapshot" TEXT,
    "rateSnapshot" DECIMAL(10,2),
    "rateTypeSnapshot" "RateType",
    "callTime" TEXT,
    "pickupInfo" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSheetCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dagsplan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shootDate" DATE NOT NULL,
    "workStartTime" TEXT,
    "workEndTime" TEXT,
    "agencyLogoUrl" TEXT,
    "clientLogoUrl" TEXT,
    "infoText" TEXT,
    "weatherText" TEXT,
    "emergencyNumbersText" TEXT,
    "radioChannelsText" TEXT,
    "printIncludeActors" BOOLEAN NOT NULL DEFAULT true,
    "printIncludeDepartmentInfo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dagsplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DagsplanLocation" (
    "id" TEXT NOT NULL,
    "dagsplanId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "locationText" TEXT,
    "locationMapsUrl" TEXT,
    "parkingText" TEXT,
    "parkingMapsUrl" TEXT,
    "parkingImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DagsplanLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DagsplanCrewEntry" (
    "id" TEXT NOT NULL,
    "dagsplanId" TEXT NOT NULL,
    "departmentTitle" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "mobile" TEXT,
    "onSetTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "linkedProjectCrewId" TEXT,

    CONSTRAINT "DagsplanCrewEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DagsplanActorEntry" (
    "id" TEXT NOT NULL,
    "dagsplanId" TEXT NOT NULL,
    "actorNumber" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "phone" TEXT,
    "film" TEXT,
    "meetTime" TEXT,
    "readyOnSetTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DagsplanActorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DagsplanScheduleEntry" (
    "id" TEXT NOT NULL,
    "dagsplanId" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "interiorExterior" TEXT,
    "dayNight" TEXT,
    "sceneSetting" TEXT,
    "info" TEXT,
    "actorNumbers" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DagsplanScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DagsplanDepartmentInfoEntry" (
    "id" TEXT NOT NULL,
    "dagsplanId" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "info" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DagsplanDepartmentInfoEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agency_name_idx" ON "Agency"("name");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Person_fullName_idx" ON "Person"("fullName");

-- CreateIndex
CREATE INDEX "Person_city_idx" ON "Person"("city");

-- CreateIndex
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_agencyId_idx" ON "Project"("agencyId");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "ProjectCrew_projectId_idx" ON "ProjectCrew"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCrew_personId_idx" ON "ProjectCrew"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCrew_projectId_personId_key" ON "ProjectCrew"("projectId", "personId");

-- CreateIndex
CREATE INDEX "PayrollList_projectId_idx" ON "PayrollList"("projectId");

-- CreateIndex
CREATE INDEX "PayrollRow_payrollListId_idx" ON "PayrollRow"("payrollListId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCrewList_projectId_key" ON "ProjectCrewList"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCrewListMember_projectCrewListId_idx" ON "ProjectCrewListMember"("projectCrewListId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCrewListMember_projectCrewListId_projectCrewId_key" ON "ProjectCrewListMember"("projectCrewListId", "projectCrewId");

-- CreateIndex
CREATE INDEX "CallSheet_projectId_idx" ON "CallSheet"("projectId");

-- CreateIndex
CREATE INDEX "CallSheet_date_idx" ON "CallSheet"("date");

-- CreateIndex
CREATE INDEX "CallSheetCrew_callSheetId_idx" ON "CallSheetCrew"("callSheetId");

-- CreateIndex
CREATE INDEX "CallSheetCrew_personId_idx" ON "CallSheetCrew"("personId");

-- CreateIndex
CREATE INDEX "Dagsplan_projectId_idx" ON "Dagsplan"("projectId");

-- CreateIndex
CREATE INDEX "Dagsplan_shootDate_idx" ON "Dagsplan"("shootDate");

-- CreateIndex
CREATE INDEX "DagsplanLocation_dagsplanId_idx" ON "DagsplanLocation"("dagsplanId");

-- CreateIndex
CREATE INDEX "DagsplanCrewEntry_dagsplanId_idx" ON "DagsplanCrewEntry"("dagsplanId");

-- CreateIndex
CREATE INDEX "DagsplanCrewEntry_linkedProjectCrewId_idx" ON "DagsplanCrewEntry"("linkedProjectCrewId");

-- CreateIndex
CREATE INDEX "DagsplanActorEntry_dagsplanId_idx" ON "DagsplanActorEntry"("dagsplanId");

-- CreateIndex
CREATE INDEX "DagsplanScheduleEntry_dagsplanId_idx" ON "DagsplanScheduleEntry"("dagsplanId");

-- CreateIndex
CREATE INDEX "DagsplanDepartmentInfoEntry_dagsplanId_idx" ON "DagsplanDepartmentInfoEntry"("dagsplanId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCrew" ADD CONSTRAINT "ProjectCrew_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCrew" ADD CONSTRAINT "ProjectCrew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollList" ADD CONSTRAINT "PayrollList_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRow" ADD CONSTRAINT "PayrollRow_payrollListId_fkey" FOREIGN KEY ("payrollListId") REFERENCES "PayrollList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRow" ADD CONSTRAINT "PayrollRow_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCrewList" ADD CONSTRAINT "ProjectCrewList_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCrewListMember" ADD CONSTRAINT "ProjectCrewListMember_projectCrewListId_fkey" FOREIGN KEY ("projectCrewListId") REFERENCES "ProjectCrewList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCrewListMember" ADD CONSTRAINT "ProjectCrewListMember_projectCrewId_fkey" FOREIGN KEY ("projectCrewId") REFERENCES "ProjectCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheet" ADD CONSTRAINT "CallSheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetCrew" ADD CONSTRAINT "CallSheetCrew_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "CallSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetCrew" ADD CONSTRAINT "CallSheetCrew_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dagsplan" ADD CONSTRAINT "Dagsplan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DagsplanLocation" ADD CONSTRAINT "DagsplanLocation_dagsplanId_fkey" FOREIGN KEY ("dagsplanId") REFERENCES "Dagsplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DagsplanCrewEntry" ADD CONSTRAINT "DagsplanCrewEntry_dagsplanId_fkey" FOREIGN KEY ("dagsplanId") REFERENCES "Dagsplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DagsplanCrewEntry" ADD CONSTRAINT "DagsplanCrewEntry_linkedProjectCrewId_fkey" FOREIGN KEY ("linkedProjectCrewId") REFERENCES "ProjectCrew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DagsplanActorEntry" ADD CONSTRAINT "DagsplanActorEntry_dagsplanId_fkey" FOREIGN KEY ("dagsplanId") REFERENCES "Dagsplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DagsplanScheduleEntry" ADD CONSTRAINT "DagsplanScheduleEntry_dagsplanId_fkey" FOREIGN KEY ("dagsplanId") REFERENCES "Dagsplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DagsplanDepartmentInfoEntry" ADD CONSTRAINT "DagsplanDepartmentInfoEntry_dagsplanId_fkey" FOREIGN KEY ("dagsplanId") REFERENCES "Dagsplan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

