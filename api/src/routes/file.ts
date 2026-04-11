import express from 'express';
import type { Request, Response } from "express";
import { db } from '../../../shared/db';
import { processing, jobs } from '../../../shared/db/schema'
import redis from '../../../shared/redis';
import { eq } from "drizzle-orm";

const router = express.Router();

router.get('/files/:id/result', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    
    if(!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    const cachekey = `file:${fileId}`;
    
    if (Array.isArray(fileId)) {
         return res.status(400).json({ error: 'Invalid File ID format' });
    }
    
    const cached = await redis.get(cachekey);
    
    if (cached) {
      console.log("Cache Hit")
      return res.json(JSON.parse(cached));
    }
    
    const result = await db.select()
      .from(processing)
      .where(eq(processing.fileId, fileId));
    
    if (result.length > 0) {
      const response = { 
        status: "completed",
        data: {
          wordCount: result[0]?.wordCount,
          sentenceCount: result[0]?.sentenceCount,
          topWords: result[0]?.topWords,
          estimatedReadingTime: result[0]?.estimatedReadingTime,
          processedAt: result[0]?.processedAt
        }
      }
      await redis.set(cachekey, JSON.stringify(response), 'EX', 60);
      return res.json(response);
    }
    
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.fileId, fileId));
    
    if(job.length > 0) {
      const jobData = job[0]!;
      
      if(jobData.status === "failed") {
        return res.json({
          status: "failed",
          error: jobData.errorMessage,
          retryCount : jobData.retryCount
        }); 
      }
      
      if (jobData.status === "pending") {
        return res.json({
          status : "retrying",
          // error: jobData.errorMessage,
          retryCount : jobData.retryCount
        })
      }
        
      
      return res.json({
              status: jobData.status
            });
    }
    else {
      return res.status(404).json({ error: 'File not found' });
    }
  }
  catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
