-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deliverable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "botType" TEXT NOT NULL,
    "instanceId" TEXT,
    "netlifySiteId" TEXT,
    "netlifyUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareSlug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deliverable_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Deliverable" ("agent", "botType", "content", "conversationId", "createdAt", "id", "instanceId", "netlifySiteId", "netlifyUrl", "title", "type") SELECT "agent", "botType", "content", "conversationId", "createdAt", "id", "instanceId", "netlifySiteId", "netlifyUrl", "title", "type" FROM "Deliverable";
DROP TABLE "Deliverable";
ALTER TABLE "new_Deliverable" RENAME TO "Deliverable";
CREATE UNIQUE INDEX "Deliverable_shareSlug_key" ON "Deliverable"("shareSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
