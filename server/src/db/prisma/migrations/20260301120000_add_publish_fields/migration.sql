-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN "publishSlug" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "Deliverable" ADD COLUMN "customDomain" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "customDomainStatus" TEXT;
ALTER TABLE "Deliverable" ADD COLUMN "customDomainVerifiedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "Deliverable_publishSlug_key" ON "Deliverable"("publishSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Deliverable_customDomain_key" ON "Deliverable"("customDomain");
