-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('verified', 'under_review', 'not_checked', 'recalled', 'removed');

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "mileage_km" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "status" "listing_status" NOT NULL DEFAULT 'not_checked',
    "evidence" TEXT[],
    "photos" TEXT[],
    "seller_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listings_created_at_idx" ON "listings"("created_at");

-- CreateIndex
CREATE INDEX "listings_seller_id_idx" ON "listings"("seller_id");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
