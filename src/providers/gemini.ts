import type { GeminiResponse } from "../types.js";
import { keys } from "../lib/config.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-3.1-flash-lite-preview";

function buildPrompt(content: string, title: string, url: string, context?: string): string {
  const contextBlock = context ? `\nCONTEXT: ${context}\n` : "";

  return `Analyze this article for a researcher.
${contextBlock}
TITLE: ${title}
URL: ${url}

CONTENT:
${content}

---

IMPORTANT: If this is an error page (404, 403, 500), login wall,
cookie consent page, or empty/placeholder content, respond with
only: EMPTY_PAGE

Otherwise respond with exactly this structure:

THESIS: [2-3 sentences — main claim or argument]

INSIGHTS:
- [non-obvious findings as tight bullet points]${context ? "\n- [prioritize insights relevant to the research context]" : ""}

EVIDENCE: [concrete data, studies, numbers, citations — one paragraph]

KEY QUOTE: [1-2 direct quotes that capture key ideas]

RELEVANCE: [how this connects to the research context, or what questions it raises]

Be dense. No preamble. No filler. Every sentence must carry signal.`;
}

export async function analyze(
  content: string,
  title: string,
  url: string,
  context?: string,
): Promise<string> {
  const apiKey = keys.gemini;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set. Run 'scout setup' for instructions.");
  }

  const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(content, title, url, context) }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  if (text.trim() === "EMPTY_PAGE") {
    throw new Error("EMPTY_PAGE");
  }

  return text;
}
