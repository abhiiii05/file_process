import { db } from "../../shared/db";
import { file, jobs } from "../../shared/db/schema";
import { eq, asc } from "drizzle-orm";
import fs from "fs/promises";
import "dotenv/config";
import path from "path";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

async function processJobs() {
  console.log("Worker Started ...");

  while (true) {
    try {
      // console.log("Before DB query");
      const pendingJob = await db.transaction(async (tx) => {
        const nextJob = await tx
          .select()
          .from(jobs)
          .where(eq(jobs.status, "pending"))
          .orderBy(asc(jobs.createdAt))
          .limit(1)
          .for('update',{skipLocked: true})
        
        if (nextJob.length === 0) return null;
        
        const job = nextJob[0];
        await tx
           .update(jobs)
           .set({ status: 'processing', startedAt: new Date() })
           .where(eq(jobs.id, job.id));
       
         return job;
      
      })
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
