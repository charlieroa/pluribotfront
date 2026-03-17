CREATE TABLE "ProjectAppEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectAppId" TEXT NOT NULL,
  "channelKey" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "payloadJson" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'system',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectAppEvent_projectAppId_fkey" FOREIGN KEY ("projectAppId") REFERENCES "ProjectApp" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ProjectAppEvent_projectAppId_createdAt_idx" ON "ProjectAppEvent"("projectAppId", "createdAt");
CREATE INDEX "ProjectAppEvent_projectAppId_channelKey_idx" ON "ProjectAppEvent"("projectAppId", "channelKey");
CREATE INDEX "ProjectAppEvent_projectAppId_eventKey_idx" ON "ProjectAppEvent"("projectAppId", "eventKey");
