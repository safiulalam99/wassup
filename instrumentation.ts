export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only start the worker on the server-side
    await import("@/lib/workers/campaign.worker")
  }
}
