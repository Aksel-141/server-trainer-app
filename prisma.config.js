const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  db: {
    url: process.env.DATABASE_URL,
  },
});
