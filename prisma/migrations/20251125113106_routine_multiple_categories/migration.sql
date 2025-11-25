/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Routine` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "RoutineToCategory" (
    "routineId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    PRIMARY KEY ("routineId", "categoryId"),
    CONSTRAINT "RoutineToCategory_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoutineToCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoutineCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Routine" ("createdAt", "description", "id", "title", "updatedAt") SELECT "createdAt", "description", "id", "title", "updatedAt" FROM "Routine";
DROP TABLE "Routine";
ALTER TABLE "new_Routine" RENAME TO "Routine";
CREATE UNIQUE INDEX "Routine_title_key" ON "Routine"("title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
