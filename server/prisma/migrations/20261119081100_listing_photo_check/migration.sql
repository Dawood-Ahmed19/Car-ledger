-- CreateEnum
CREATE TYPE "photo_check_state" AS ENUM ('passed', 'pending');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "photo_check" TEXT NOT NULL DEFAULT 'passed';
