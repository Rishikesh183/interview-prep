/**
 * Pulls a JSON object out of a model reply. Free models often wrap JSON in code fences,
 * prepend chatter, or emit <think> blocks before answering.
 */
export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object in model output");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}
