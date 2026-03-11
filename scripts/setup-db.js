#!/usr/bin/env node
/**
 * Switches Prisma schema provider based on DATABASE_URL.
 * - postgresql:// or postgres:// → postgresql provider
 * - file:                        → sqlite provider (default)
 */
const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
const dbUrl = process.env.DATABASE_URL || "";

const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
const provider = isPostgres ? "postgresql" : "sqlite";

let schema = fs.readFileSync(schemaPath, "utf8");

schema = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${provider}"`
);

fs.writeFileSync(schemaPath, schema);
console.log(`✓ Prisma provider set to: ${provider}`);
