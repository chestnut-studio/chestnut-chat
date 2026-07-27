import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({
  path: "../../apps/server/.env",
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(databaseUrl);

await sql`CREATE EXTENSION IF NOT EXISTS vector`;
await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

console.log("Enabled Postgres extensions: vector, pg_trgm");
