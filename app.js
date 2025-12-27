import express from "express";

import dotenv from 'dotenv';
dotenv.config();

import gamesRouter from './router/games.router.js'

const app = express();

const port = 3000;

app.use(express.json());

app.use("/api", gamesRouter);

app.listen(port, () => {
  console.log(`Server start`);
  console.log(`Server runs on port:${port}`);
  console.log(`Server runs on http://localhost:${port}`);
});
