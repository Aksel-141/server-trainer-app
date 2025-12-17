import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

//Формуємо шлях до файлу БД в папці документи.
const documentFolderPath = path.join(os.homedir(), "Documents", "TrainApp");
const dbFilePath = path.join(
  documentFolderPath,
  process.env.DATABASE_NAME || "dev.db"
);

if (!fs.existsSync(documentFolderPath)) {
  fs.mkdirSync(documentFolderPath, { recursive: true });
  console.log("📁папку", documentFolderPath, dbFilePath);
}

const dbPath = `file:${dbFilePath}`;
process.env.DATABASE_URL = dbPath;
// const dbPath =
//   process.env.DATABASE_URL?.replace("file:", "") || "./database/dev.db";

const adapter = new PrismaBetterSqlite3({
  url: dbPath,
});

const prisma = new PrismaClient({ adapter });

export default prisma;

// Стара версія prisma v6
// const prisma = new PrismaClient();
// module.exports = prisma;
