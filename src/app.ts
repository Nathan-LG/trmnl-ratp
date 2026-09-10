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
app.use(express.static("public"));
app.use(express.json());

// ----- Main page ----------------------------------------------------------

app.get("/", (req: express.Request, res: express.Response) => {
  if (!verifySecret(req.headers["authorization"] as string, API_KEY)) {
    console.log("Unauthorized");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  res.status(200).send({
    time: new Date().toISOString(),
    lines: {
      metro_12: {
        next: [2, 4],
        status: "running",
        message: null,
      },
      tram_t3a: {
        next: [null, null],
        status: "stopped",
        message: "La ligne est arrêtée en raison d'un incident.",
      },
      metro_14: {
        next: [16, 34],
        status: "disrupted",
        message: "La ligne est perturbée en raison d'un incident.",
      },
    },
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
