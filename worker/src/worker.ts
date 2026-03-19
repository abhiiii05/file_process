import { db } from "../../shared/db";
import { file, jobs } from "../../shared/db/schema";
import { eq, asc, sql, lt, or, and } from "drizzle-orm";
import fs from "fs/promises";
import "dotenv/config";
import path from "path";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const MAX_RETRIES = 3;


async function processJobs() {
  console.log("Worker Started ...");

  while (true) {
    try {
      // console.log("Before DB query");
      const pendingJob = await db.transaction(async (tx) => {
        const THRESHOLD_TIME = new Date(Date.now() - 30*1000);
        const nextJob = await tx
          .select()
          .from(jobs)
          .where(or(eq(jobs.status, "pending"), and(eq(jobs.status, "processing"), lt(jobs.startedAt, THRESHOLD_TIME))))
          .orderBy(asc(jobs.createdAt))
          .limit(1)
          .for("update", { skipLocked: true });

        if (nextJob.length === 0) return null;

        const job = nextJob[0];
        await tx
          .update(jobs)
          .set({
            status: "processing",
            startedAt: new Date(),
            // retryCount: job.status === "processing" ? sql`${jobs.retryCount} + 1` : jobs.retryCount
          })
          .where(eq(jobs.id, job.id));

        return job;
      });
      // .select()
      // .from(jobs)
      // .where(eq(jobs.status, "pending"))
      // .limit(1);
      // console.log("After DB query", pendingJob);

      if (!pendingJob) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      const job = pendingJob;
      // console.log("Job under process  : ", job.id);

      // await db
      //   .update(jobs)
      //   .set({ status: "processing" })
      //   .where(eq(jobs.id, job.id));

      const fileData = await db
        .select()
        .from(file)
        .where(eq(file.id, job.fileId));
      console.log("file data :: ", fileData);
      if (fileData.length === 0) {
        throw new Error(`File not found in DB`);
      }
      const storagePath = fileData[0].storagePath;
      console.log("File path: ", storagePath);

      const filepath = path.resolve(process.cwd(), "api", storagePath);
      console.log("Reading file at:", filepath);
      // const data = await fs.readFile(filepath, "utf-8");
      // console.log("File content: ", data);

      await new Promise((r) => setTimeout(r, 3000));
      try {
        const data = await fs.readFile(filepath, "utf-8");
        console.log("File content: ", data);
        await db
          .update(jobs)
          .set({ status: "completed", completedAt: new Date})
          .where(eq(jobs.id, job.id));
      } catch (error) {
        const [{ newretryCount }] = await db
          .update(jobs)
          .set({
            retryCount: sql`${jobs.retryCount}+1`,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            // status: "pending"
          })
          .where(eq(jobs.id, job.id))
          .returning({ newretryCount: jobs.retryCount });

        // if (newretryCount < MAX_RETRIES) {
        //   await db
        //     .update(jobs)
        //     .set({ status: "pending" })
        //     .where(eq(jobs.id, job.id));
        // } else {
        //   await db
        //     .update(jobs)
        //     .set({ status: "failed" })
        //     .where(eq(jobs.id, job.id));
        //   console.log("Job Failed : ", job.id);
        // }
        
        
        const nextStatus = newretryCount < MAX_RETRIES ? "pending" : "failed";
        await db
          .update(jobs)
          .set({ status: nextStatus })
          .where(eq(jobs.id, job.id));
      
        if (nextStatus === "failed") {
          console.log("❌ Job permanently failed:", job.id);
        }
        else {
          console.log("🔁 Job retrying:", job.id);
        }
      }
      
    } catch (error) {
      console.error(error);
      console.log("Worker failed :  ", error);
    }
  }
}

processJobs();
