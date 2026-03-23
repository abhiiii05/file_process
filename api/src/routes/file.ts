import express from 'express';
import type { Request, Response } from "express";
import { db } from '../../../shared/db';
import { processing , jobs} from '../../../shared/db/schema'
import { eq } from "drizzle-orm";

const router = express.Router();

router.get('/files/:id/result', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    
    if(!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    if (Array.isArray(fileId)) {
         return res.status(400).json({ error: 'Invalid File ID format' });
       }
    
    const result = await db.select()
      .from(processing)
      //fix delteing the node modules and bun lock then reinstall
      .where(eq(processing.fileId, fileId));
    
    if (result.length > 0) {
      return res.json({
        status: "completed",
        data: result[0]
      });
    }
    
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.fileId, fileId));
    
    if(job.length > 0) {
      const jobData = job[0]!;
      
      if(jobData.status === "failed") {
        return res.json({
          status: "failed",
          error: jobData.errorMessage
        });
        
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
