import crypto from "crypto";

const PRIM_API_URL = "https://prim.iledefrance-mobilites.fr/marketplace/";
const PRIM_API_KEY = process.env.PRIM_API_KEY || "";

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

  console.dir(generalDeliveries, { depth: null });

  return generalDeliveries
    .flatMap((delivery: any) => delivery.InfoMessage || [])
    .flatMap((info: any) => info.Content?.Message || [])
    .filter((msg: any) => msg.MessageType === "SHORT_MESSAGE")
    .filter((msg: any) => msg.MessageText?.lang === "fr")
    .map((msg: any) => msg.MessageText?.value);
};
