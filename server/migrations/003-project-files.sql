-- Migration: Create ProjectFile table for disk-based file persistence
-- Run via: ssh pluribots 'sqlite3 /var/www/pluribots/data/plury.db < /var/www/pluribots/server/migrations/003-project-files.sql'
-- NEVER use prisma db push — it drops/recreates tables and loses data.

CREATE TABLE IF NOT EXISTS ProjectFile (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  deliverableId TEXT NOT NULL,
  filePath TEXT NOT NULL,
  hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  lastModified DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES Conversation(id),
  FOREIGN KEY (deliverableId) REFERENCES Deliverable(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projfile_deliv_path ON ProjectFile(deliverableId, filePath);
CREATE INDEX IF NOT EXISTS idx_projfile_conv ON ProjectFile(conversationId);
