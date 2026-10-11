import { requireUser, jsonError } from "@/lib/publicationServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return jsonError(401, "Sign in to check your subscription.");

    const currentPeriodEnd = user.subscriptionPeriodEnd?.toISOString() ?? null;
    const isPremium =
      user.subscriptionStatus === "active" &&
      (!user.subscriptionPeriodEnd || user.subscriptionPeriodEnd.getTime() > Date.now());

    return Response.json(
      {
        isPremium,
        status: user.subscriptionStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Subscription status lookup failed:", error);
    return jsonError(500, "Could not verify your subscription status.");
  }
}
