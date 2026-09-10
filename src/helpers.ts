import crypto from "crypto";

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
