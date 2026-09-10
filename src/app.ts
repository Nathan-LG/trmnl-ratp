import express from "express";

// Env vars

//const PRIM_API_KEY = process.env.API_KEY || "";
const PORT = process.env.PORT || "";

// Express configuration

const app = express();
app.disable("x-powered-by");
app.use(express.json());

// ----- Main page ----------------------------------------------------------

app.get("/", (_: express.Request, res: express.Response) => {
  res.status(200).send("Welcome to the API");
});

// ----- Healthcheck --------------------------------------------------------

app.get("/health", (_: express.Request, res: express.Response) => {
  res.status(200).send("OK");
});

// Start app

app.listen(PORT ? Number(PORT) : 4567);
