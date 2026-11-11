-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notify_evidence" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_messages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_scam" BOOLEAN NOT NULL DEFAULT true;
