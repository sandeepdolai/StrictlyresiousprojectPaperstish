import DodoPayments from "dodopayments";

/**
 * Keep all Dodo API traffic server-side. Unless explicitly set to live_mode,
 * use test mode so a missing or mistyped environment variable can't charge.
 */
export function getDodoPaymentsClient() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) throw new Error("DODO_PAYMENTS_API_KEY is not configured.");

  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "live_mode"
    : "test_mode";

  return new DodoPayments({
    bearerToken,
    environment,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
  });
}
