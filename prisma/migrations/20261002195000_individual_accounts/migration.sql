-- Individual accounts, lists and sharing.
--
-- This drops `Group`, `User`, `UserGroup` and `Gift` outright rather than
-- altering them. `prisma migrate diff` proposed
-- `ALTER TABLE "Gift" DROP COLUMN "groupId", ADD COLUMN "listId" TEXT NOT NULL`,
-- which cannot run: a NOT NULL column added to a table holding rows has nothing
-- to put in it, and Postgres rejects it outright. The rows in question are the
-- three seeded demo gifts on a branch copy, and the spec records a deliberate
-- clean break with no migration of them, so a table that is emptied anyway is
-- dropped and recreated instead of carried through a rewrite.
--
-- Destructive by construction. It is written to be applied to a branch, never to
-- `production`, which still serves the deployed app on the old schema.

-- DropTable
DROP TABLE "Gift";
DROP TABLE "UserGroup";
DROP TABLE "Group";
DROP TABLE "User";

-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visibility" "ListVisibility" NOT NULL DEFAULT 'PRIVATE',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListAccess" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listId" TEXT NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE INDEX "List_ownerId_idx" ON "List"("ownerId");

-- CreateIndex
CREATE INDEX "ListAccess_accountId_idx" ON "ListAccess"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ListAccess_listId_accountId_key" ON "ListAccess"("listId", "accountId");

-- CreateIndex
CREATE INDEX "Gift_listId_idx" ON "Gift"("listId");

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListAccess" ADD CONSTRAINT "ListAccess_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListAccess" ADD CONSTRAINT "ListAccess_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Gift" ADD CONSTRAINT "Gift_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;