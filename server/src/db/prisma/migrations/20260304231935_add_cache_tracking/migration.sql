-- AlterTable
ALTER TABLE "User" ADD COLUMN "githubToken" TEXT;
ALTER TABLE "User" ADD COLUMN "metaAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "metaAdAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN "metaBusinessId" TEXT;
ALTER TABLE "User" ADD COLUMN "metaTokenExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "metaUserName" TEXT;

-- CreateTable
CREATE TABLE "ProjectSchema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "columnsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectSchema_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectData_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nueva conversación',
    "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "assignedAgentId" TEXT,
    "supabaseUrl" TEXT,
    "supabaseAnonKey" TEXT,
    "projectBackendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conversation_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("assignedAgentId", "createdAt", "id", "needsHumanReview", "supabaseAnonKey", "supabaseUrl", "title", "updatedAt", "userId") SELECT "assignedAgentId", "createdAt", "id", "needsHumanReview", "supabaseAnonKey", "supabaseUrl", "title", "updatedAt", "userId" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE TABLE "new_UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cacheCreationInputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadInputTokens" INTEGER NOT NULL DEFAULT 0,
    "conversationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UsageRecord_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UsageRecord" ("agentId", "createdAt", "id", "inputTokens", "model", "outputTokens", "userId") SELECT "agentId", "createdAt", "id", "inputTokens", "model", "outputTokens", "userId" FROM "UsageRecord";
DROP TABLE "UsageRecord";
ALTER TABLE "new_UsageRecord" RENAME TO "UsageRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSchema_conversationId_tableName_key" ON "ProjectSchema"("conversationId", "tableName");

-- CreateIndex
CREATE INDEX "ProjectData_conversationId_tableName_idx" ON "ProjectData"("conversationId", "tableName");

-- CreateIndex
CREATE INDEX "ProjectUser_conversationId_idx" ON "ProjectUser"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUser_conversationId_email_key" ON "ProjectUser"("conversationId", "email");
