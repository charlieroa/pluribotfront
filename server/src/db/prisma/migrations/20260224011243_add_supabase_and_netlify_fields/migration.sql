-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "supabaseAnonKey" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "supabaseUrl" TEXT;

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN "netlifySiteId" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "netlifyUrl" TEXT;
