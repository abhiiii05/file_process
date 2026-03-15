import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';

export default defineConfig({
  schema: "../shared/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});