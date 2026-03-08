import express from 'express';
import type { Request, Response } from 'express';
const app = express();
const port : number = 3000;

app.get('/health', (req: Request, res: Response) => {
  res.send('OK');
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})