-- Add dedicated editor token fields to Conversation
-- Separates editor tokens from webhook secrets to avoid conflicts
ALTER TABLE "Conversation" ADD COLUMN "editorToken" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "editorTokenExpiresAt" DATETIME;
