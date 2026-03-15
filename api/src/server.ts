import express from "express";
import { db } from "../../shared/db";
import uploadRoute from "./routes/upload";

import type { Request, Response } from "express";
const app = express();
const port: number = 3000;

app.use("/api", uploadRoute);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log("DB Connected");
});
