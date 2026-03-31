-- CreateTable
CREATE TABLE "ProjectCrewListShare" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCrewListShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCrewListShare_projectId_key" ON "ProjectCrewListShare"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCrewListShare_token_key" ON "ProjectCrewListShare"("token");

-- CreateIndex
CREATE INDEX "ProjectCrewListShare_token_idx" ON "ProjectCrewListShare"("token");

-- AddForeignKey
ALTER TABLE "ProjectCrewListShare" ADD CONSTRAINT "ProjectCrewListShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
