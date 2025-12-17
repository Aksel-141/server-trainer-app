import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath =
  process.env.DATABASE_URL?.replace("file:", "") || "./database/dev.db";

const adapter = new PrismaBetterSqlite3({
  url: dbPath,
});

const prisma = new PrismaClient({ adapter });

export default prisma;

// Стара версія prisma v6
// const prisma = new PrismaClient();
// module.exports = prisma;
