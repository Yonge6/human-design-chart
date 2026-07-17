export async function createHumanDesignChart(input, {
  baseUrl = "https://api-human-design.wonderelian.com",
  signal,
} = {}) {
  const response = await fetch(`${baseUrl}/v1/charts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const envelope = await response.json();
  if (!response.ok || envelope.error) {
    const error = new Error(envelope.error?.message || `Request failed (${response.status})`);
    error.code = envelope.error?.code || "INTERNAL_ERROR";
    error.requestId = envelope.requestId;
    throw error;
  }
  return envelope.data;
}
