CREATE TABLE "ProjectApp" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "conversationId" TEXT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "appType" TEXT NOT NULL,
  "vertical" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "runtime" TEXT NOT NULL DEFAULT 'project_backend',
  "configJson" TEXT,
  "capabilitiesJson" TEXT,
  "metadataJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectApp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectApp_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectApp_projectId_slug_key" ON "ProjectApp"("projectId", "slug");
CREATE INDEX "ProjectApp_projectId_appType_idx" ON "ProjectApp"("projectId", "appType");
