-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "scamCheckedAt" TIMESTAMP(3),
ADD COLUMN     "scamRisk" TEXT,
ADD COLUMN     "scamWarning" TEXT;
