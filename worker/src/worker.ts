import { db } from "../../shared/db";
import { file, jobs } from "../../shared/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import "dotenv/config";
import path from "path";

// console.log("DATABASE_URL:", process.env.DATABASE_URL);

async function processJobs() {
  console.log("Worker Started ...");

  while (true) {
    try {
      // console.log("Before DB query");
      const pendingJob = await db
        .select()
        .from(jobs)
        .where(eq(jobs.status, "pending"))
        .limit(1);
      // console.log("After DB query", pendingJob);

      if (pendingJob.length === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      const job = pendingJob[0];
      console.log("Job under process  : ", job.id);

      await db
        .update(jobs)
        .set({ status: "processing" })
        .where(eq(jobs.id, job.id));

      const fileData = await db
        .select()
        .from(file)
        .where(eq(file.id, job.fileId));
      console.log("file data :: ", fileData);

      const storagePath = fileData[0].storagePath;
      console.log("File path: ", storagePath);

      const filepath = path.resolve(process.cwd(), "api", storagePath);
      console.log("Reading file at:", filepath);
      const data = await fs.readFile(filepath, "utf-8");
      console.log("File content: ", data);

      await new Promise((r) => setTimeout(r, 3000));

      await db
        .update(jobs)
        .set({ status: "completed" })
        .where(eq(jobs.id, job.id));

      console.log("Job completed: ", job.id);
    } catch (error) {
      console.error(error);
      console.log("Worker failed :  ", error);
    }
  }
}

processJobs();
