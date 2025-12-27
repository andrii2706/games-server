import express from "express";

const app = express();

const port = 3000;

app.use(express.json());

app.listen(port, () => {
  console.log(`Server start`);
  console.log(`Server runs on port:${port}`);
  console.log(`Server runs on http://localhost:${port}`);
});
