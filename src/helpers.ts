import crypto from "crypto";

const PRIM_API_URL = "https://prim.iledefrance-mobilites.fr/marketplace/";
const PRIM_API_KEY = process.env.PRIM_API_KEY || "";

const TERMINUS_API_URL = process.env.TERMINUS_API_URL || "";
const TERMINUS_LOGIN = process.env.TERMINUS_LOGIN || "";
const TERMINUS_PASSWORD = process.env.TERMINUS_PASSWORD || "";

/**
 * Verifies the webhook signature by comparing the received secret with the expected secret using a constant-time comparison to prevent timing attacks.
 *
 * @param receivedSecret The secret received from the webhook request.
 * @param expectedSecret The expected secret configured in the application.
 * @returns A boolean indicating whether the received secret matches the expected secret.
 */
export const verifySecret = (
  receivedSecret: string,
  expectedSecret: string,
) => {
  if (!receivedSecret) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSecret),
      Buffer.from(expectedSecret),
    );
  } catch {
    return false;
  }
};

/**
 * Retrieves the upcoming departure times for a given stop.
 *
 * @param stopId The ID of the stop for which to retrieve the upcoming departure times.
 * @returns An array of objects containing the destination and expected departure time for each upcoming vehicle.
 */
export const getStopTimes = async (stopId: string) => {
  const metroResponse = await fetch(
    PRIM_API_URL + "stop-monitoring?MonitoringRef=" + stopId,
    {
      headers: {
        apiKey: PRIM_API_KEY,
      },
    },
  );
  const metroData: any = await metroResponse.json();

  const now = new Date();

  const stopMonitoring =
    metroData?.Siri?.ServiceDelivery?.StopMonitoringDelivery || [];

  const times = stopMonitoring
    .flatMap((delivery: any) => delivery.MonitoredStopVisit || [])
    .map((visit: any) => {
      const journey = visit.MonitoredVehicleJourney || {};
      const call = journey.MonitoredCall || {};
      const departureTimeStr = call.ExpectedDepartureTime;

      return {
        destination:
          journey.DestinationName?.[0]?.value ||
          call.DestinationDisplay?.[0]?.value,
        expectedDepartureTime: departureTimeStr
          ? new Date(departureTimeStr)
          : null,
      };
    })
    .filter(
      (item: any) =>
        item.expectedDepartureTime && item.expectedDepartureTime > now,
    )
    .sort(
      (a: any, b: any) => a.expectedDepartureTime - b.expectedDepartureTime,
    );
  return times;
};

/**
 * Retrieves the traffic information for a given stop.
 *
 * @param stopId The ID of the stop for which to retrieve traffic information.
 * @returns An array of short messages describing the current traffic conditions.
 */
export const getInfoTraffic = async (stopId: string) => {
  const response = await fetch(
    PRIM_API_URL +
      "general-message?LineRef=" +
      stopId +
      "&InfoChannelRef=Perturbation",
    {
      headers: {
        apiKey: PRIM_API_KEY,
      },
    },
  );
  const data: any = await response.json();

  const generalDeliveries =
    data?.Siri?.ServiceDelivery?.GeneralMessageDelivery || [];

  return generalDeliveries
    .flatMap((delivery: any) => delivery.InfoMessage || [])
    .flatMap((info: any) => info.Content?.Message || [])
    .filter((msg: any) => msg.MessageType === "SHORT_MESSAGE")
    .filter((msg: any) => msg.MessageText?.lang === "fr")
    .map((msg: any) => msg.MessageText?.value);
};

/**
 * Logs in to the Terminus system and retrieves access and refresh tokens.
 *
 * @returns An object containing the access and refresh tokens.
 */
export const loginTerminus = async () => {
  const response = await fetch(TERMINUS_API_URL + "login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login: TERMINUS_LOGIN,
      password: TERMINUS_PASSWORD,
    }),
  });
  const data: any = await response.json();

  if (data?.access_token && data?.refresh_token) {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } else {
    throw new Error("Failed to log in to Terminus");
  }
};

/**
 * Refreshes the Terminus access token using the provided refresh token.
 *
 * @param accessToken The current access token used for authorization.
 * @param refreshToken The refresh token used to obtain a new access token.
 * @returns An object containing the new access and refresh tokens.
 */
export const refreshTerminusToken = async (
  accessToken: string,
  refreshToken: string,
) => {
  const response = await fetch(TERMINUS_API_URL + "api/jwt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });
  const data: any = await response.json();

  if (data?.access_token && data?.refresh_token) {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } else {
    throw new Error("Failed to refresh Terminus token");
  }
};

/**
 * Retrieves the battery charge of a Kindle device.
 *
 * @param deviceId The ID of the Kindle device.
 * @param accessToken The access token used for authorization.
 * @returns The battery charge of the Kindle device.
 */
export const getKindleBattery = async (
  deviceId: string,
  accessToken: string,
) => {
  const response = await fetch(TERMINUS_API_URL + "api/devices/" + deviceId, {
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
  });
  const data: any = await response.json();

  if (data?.data?.battery_charge) {
    return data.data.battery_charge;
  } else {
    throw new Error("Failed to retrieve Kindle battery");
  }
};
