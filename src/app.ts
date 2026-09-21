import express from "express";
import {
  verifySecret,
  getStopTimes,
  getInfoTraffic,
  loginTerminus,
  refreshTerminusToken,
  getKindleBattery,
} from "./helpers.ts";

// Env vars

const METRO_12 = process.env.METRO_12 || "";
const METRO_12_PORTE_DE_VERSAILLES =
  process.env.METRO_12_PORTE_DE_VERSAILLES || "";

const TRAM_T3A = process.env.TRAM_T3A || "";
const TRAM_T3A_PORTE_DE_VERSAILLES =
  process.env.TRAM_T3A_PORTE_DE_VERSAILLES || "";

const METRO_14 = process.env.METRO_14 || "";

const TERMINUS_DEVICE = process.env.TERMINUS_DEVICE || "";

const VERSION = process.env.GIT_TAG || "dev";

const API_KEY = process.env.API_KEY || "";
const PORT = process.env.PORT || "";

// Express configuration

const app = express();
app.disable("x-powered-by");
app.use(express.static(VERSION === "dev" ? "public" : "/app/dist/public"));
app.use(express.json());

let accessToken = "";
let refreshToken = "";

// ----- Main page ----------------------------------------------------------

app.get("/", async (req: express.Request, res: express.Response) => {
  if (!verifySecret(req.headers["authorization"] as string, API_KEY)) {
    console.log("Unauthorized");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Ensure we have valid Terminus access and refresh tokens before proceeding

  if (!accessToken) {
    try {
      ({ accessToken, refreshToken } = await loginTerminus());
    } catch (error) {
      console.log("Failed to log in to Terminus:", error);
      res.status(500).json({ message: "Failed to log in to Terminus" });
      return;
    }
  } else {
    try {
      ({ accessToken, refreshToken } = await refreshTerminusToken(
        accessToken,
        refreshToken,
      ));
    } catch (error) {
      console.log("Failed to refresh Terminus token:", error);

      try {
        ({ accessToken, refreshToken } = await loginTerminus());
      } catch (error) {
        console.log("Failed to log in to Terminus:", error);
        res.status(500).json({ message: "Failed to log in to Terminus" });
        return;
      }
    }
  }

  // Get Kindle battery

  let battery = null;

  try {
    battery = await getKindleBattery(TERMINUS_DEVICE, accessToken);
  } catch (error) {
    console.log("Failed to retrieve Kindle battery:", error);
  }

  // Retrieve stop times and traffic information for the specified metro and tram lines

  const metro12Stops = await getStopTimes(METRO_12_PORTE_DE_VERSAILLES);
  const metro12Traffic = await getInfoTraffic(METRO_12);
  const tramT3aStops = await getStopTimes(TRAM_T3A_PORTE_DE_VERSAILLES);
  const tramT3aTraffic = await getInfoTraffic(TRAM_T3A);
  const metro14Traffic = await getInfoTraffic(METRO_14);

  // Send the response with the retrieved information

  res.status(200).send({
    time: new Date().toISOString(),
    lines: {
      metro_12: {
        next: metro12Stops.map((item: any) =>
          item.expectedDepartureTime
            ? Math.floor(
                (item.expectedDepartureTime.getTime() - new Date().getTime()) /
                  60000,
              )
            : null,
        ),
        terminus: metro12Stops.length > 0 ? metro12Stops[0].destination : null,
        message: metro12Traffic,
      },
      tram_t3a: {
        next: tramT3aStops.map((item: any) =>
          item.expectedDepartureTime
            ? Math.floor(
                (item.expectedDepartureTime.getTime() - new Date().getTime()) /
                  60000,
              )
            : null,
        ),
        terminus: tramT3aStops.length > 0 ? tramT3aStops[0].destination : null,
        message: tramT3aTraffic,
      },
      metro_14: {
        message: metro14Traffic,
      },
    },
    battery: battery,
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
