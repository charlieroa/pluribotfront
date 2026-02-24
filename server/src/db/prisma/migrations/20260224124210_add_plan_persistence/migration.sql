-- CreateTable
CREATE TABLE "PendingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExecutingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepsJson" TEXT NOT NULL,
    "executionGroupsJson" TEXT NOT NULL,
    "currentGroupIndex" INTEGER NOT NULL DEFAULT 0,
    "completedInstances" TEXT NOT NULL,
    "agentOutputs" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelOverride" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutingPlan_conversationId_key" ON "ExecutingPlan"("conversationId");
