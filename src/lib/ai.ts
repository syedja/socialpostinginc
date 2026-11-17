/**
 * AI writing via the Anthropic Messages API (server-only).
 * Set ANTHROPIC_API_KEY to turn it on. ANTHROPIC_MODEL picks the model
 * (default: claude-haiku-5-5, a fast low-cost model).
 */

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function complete(system: string, prompt: string, maxTokens = 1200): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI writing is not set up yet (ANTHROPIC_API_KEY is missing).");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    content?: { type: string; text?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data.error?.message ?? `AI request failed (${res.status})`);
  return (data.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}

/** Pull the first JSON array out of a model reply. */
export function extractJsonArray<T>(text: string): T[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}
