-- CreateEnum
CREATE TYPE "evidence_type" AS ENUM ('registration', 'inspection', 'service', 'owner_cnic');

-- CreateEnum
CREATE TYPE "evidence_state" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "evidence_documents" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "type" "evidence_type" NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "state" "evidence_state" NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_documents_listing_id_idx" ON "evidence_documents"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_documents_listing_id_type_key" ON "evidence_documents"("listing_id", "type");

-- AddForeignKey
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
