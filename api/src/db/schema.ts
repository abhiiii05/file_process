import { integer, varchar, pgTable, uuid, text ,timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt : timestamp("createdAt").defaultNow(),
})