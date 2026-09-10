import express from "express";
import { verifySecret } from "./helpers.ts";

// Env vars

const PRIM_API_KEY = process.env.PRIM_API_KEY || "";
const VERSION = process.env.GIT_TAG || "dev";
const API_KEY = process.env.API_KEY || "";
const PORT = process.env.PORT || "";

// Express configuration

const app = express();
app.disable("x-powered-by");
app.use(express.json());

// ----- Main page ----------------------------------------------------------

app.get("/", (req: express.Request, res: express.Response) => {
  if (!verifySecret(req.headers["authorization"] as string, API_KEY)) {
    console.log("Unauthorized");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  res.status(200).send({
    test: true,
  });
});

// ----- Version -------------------------------------------------------------

app.get("/version", (_: express.Request, res: express.Response) => {
  res.status(200).send(VERSION);
});

// ----- Healthcheck --------------------------------------------------------

app.get("/health", (_: express.Request, res: express.Response) => {
  res.status(200).send("OK");
});

// Start app

app.listen(PORT ? Number(PORT) : 4567);
