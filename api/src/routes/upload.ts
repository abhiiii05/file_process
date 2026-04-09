import express from 'express';
import type { Request, Response } from "express";
import multer = require("multer");
import crypto from 'crypto';
import fs from 'fs';
import { db } from '../../../shared/db';
import { file, jobs } from '../../../shared/db/schema';
import queue from '../../../shared/queue';


const router = express.Router();


const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void
    ) => {
      cb(null, Date.now() + "-" + file.originalname);
    }
})

const upload = multer({storage})

router.post('/upload', upload.single('file'),  async (req: Request, res: Response) => {
  try {
    const uploadFile = req.file;
    if (!uploadFile) {
      return res.status(400).send('No file uploaded.');
    }
    const fileBuffer = fs.readFileSync(uploadFile.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');// checksum
    const newFile = await db.insert(file).values({
      userId: "7fa07482-cf96-44eb-a749-0b0b99238a93",
      fileName: uploadFile.originalname,
      fileSize: uploadFile.size,
      storagePath: uploadFile.path,
      checksum: hash,
    }).returning();
    
     
    const insertedFile = newFile[0];
    
    if (!insertedFile) {
      throw new Error("File insert failed");
    }
    
    const [insertedJob] =await db.insert(jobs).values({
      fileId: insertedFile.id,
    }).returning({jobId: jobs.id});
    ;
    await queue.add('file_processing', { jobId : insertedJob?.jobId, fileId: insertedFile.id },{attempts:3});
    console.log("Job added to queue")
    
    res.json({
          message: "File uploaded",
          fileId: insertedFile.id
        })
    
  }
  
  catch (error) {
    console.error(error)
    return res.status(500).send('Internal Server Error');
  }
})

export default router;
