import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';
import "dotenv/config";


console.log("DB URL:", process.env.DATABASE_URL);

export default defineConfig({
  
  schema: "./shared/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});