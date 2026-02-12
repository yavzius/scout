import type { GeminiResponse } from "../types.js";
import { keys } from "../lib/config.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-3-flash-preview";

function buildPrompt(content: string, title: string, url: string, context?: string): string {
  const contextBlock = context
    ? `\nRESEARCH CONTEXT: The researcher is exploring: "${context}"\nFocus your analysis on what's most relevant to this question.\n`
    : "";

  return `Analyze this article and extract the most valuable information for a researcher.
${contextBlock}
ARTICLE TITLE: ${title}
URL: ${url}

ARTICLE CONTENT:
${content}

---

Provide a structured analysis with:

1. **CORE ARGUMENT** (2-3 sentences): What is the main thesis or claim?

2. **KEY INSIGHTS** (bullet points): What are the most novel or important ideas? Focus on non-obvious insights.${context ? " Prioritize insights relevant to the research context." : ""}

3. **EVIDENCE & DATA** (bullet points): What concrete evidence, studies, or data supports the claims? Include specific numbers, citations, or examples.

4. **NOTABLE QUOTES** (2-3 max): Direct quotes that capture key ideas. Format: "quote" — context

5. **CREDIBILITY SIGNALS**: Author expertise, publication quality, cited sources, potential biases.

6. **CONNECTIONS**: How might this relate to other fields or ideas?${context ? " How does it connect to the research question?" : ""} What questions does it raise?

Be concise but substantive. Prioritize novel insights over obvious points. Include specific details, not vague summaries.`;
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

  return text;
}
