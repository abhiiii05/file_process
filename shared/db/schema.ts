import { integer, varchar, pgTable, uuid, text, timestamp, pgEnum, jsonb, bigint } from "drizzle-orm/pg-core";
import { index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at",{ withTimezone: true }).defaultNow().notNull(),
});


export const statusEnum = pgEnum("status", ["pending", "processing", "completed", "failed"]);

export const file = pgTable("file", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  storagePath: text("storage_path").notNull(),
  status: statusEnum("status").default("pending").notNull(),
  checksum: varchar("checksum", { length: 255 }).notNull(),
  createdAt: timestamp("created_at",{ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at",{ withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
},
  (table) => ({
    userIdx: index("file_user_id_idx").on(table.userId),
    statusIdx: index("file_status_idx").on(table.status),
  })
);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").references(() => file.id, { onDelete: "cascade" }).notNull(),
  status: statusEnum("status").default("pending").notNull(),
  retryCount: integer("retry_count").notNull().default(0),
  startedAt: timestamp("started_at",{ withTimezone: true }),
  completedAt: timestamp("completed_at",{ withTimezone: true }),
  updatedAt: timestamp("updated_at",{ withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  errorMessage: text("error_msg"),
  createdAt: timestamp("created_at",{ withTimezone: true }).defaultNow().notNull(),
},
  (table) => ({
    fileIdIdx: index("jobs_file_id_idx").on(table.fileId),
    statusIdx: index("jobs_status_idx").on(table.status),
  })
);


export const processing = pgTable("processing", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").unique().references(() => jobs.id, { onDelete: "cascade" }).notNull(),
  fileId: uuid("file_id").references(() => file.id, { onDelete: "cascade" }).notNull(),
  wordCount: integer("word_count").notNull(),
  sentenceCount: integer("sentence_count").notNull(),
  topWords: jsonb("top_words").$type<{ word: string; count: number }[]>().notNull(),
  estimatedReadingTime: integer("estimated_reading_time").notNull(),
  processedAt: timestamp("processed_at",{ withTimezone: true }).defaultNow().notNull(),
},
  (table) => ({
    jobIdx: index("processing_job_id_idx").on(table.jobId),
    fileIdx: index("processing_file_id_idx").on(table.fileId),
  })
);