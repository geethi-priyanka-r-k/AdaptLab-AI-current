import type { TestViolation, PerformanceEvidence, ResourceEvidence } from "../testing/types";
import { logger } from "../lib/logger";

export type GroqAnalysisInput = {
  profile: "low" | "medium" | "high";
  adaptiveContract: {
    networkProfile: string;
    imagePolicy: string;
    javascriptPolicy: string;
    featurePolicy: string;
    maxResourceSizeKb: number;
    maxLcpMs: number;
  };
  observedEvidence: {
    violations: TestViolation[];
    metrics: PerformanceEvidence;
    resourceCount: number;
  };
};

export type GroqAnalysisOutput = {
  summary: string;
  rootCause: string;
  impact: string;
  explanation: string;
  recommendations: string[];
};

export type GroqAnalysisResult = GroqAnalysisOutput | { error: string; unavailable: true };

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

function validateGroqConfig(): boolean {
  return !!(GROQ_API_KEY && GROQ_API_KEY.length > 0);
}

function validateAnalysisOutput(data: unknown): data is GroqAnalysisOutput {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  
  return (
    typeof obj.summary === "string" &&
    typeof obj.rootCause === "string" &&
    typeof obj.impact === "string" &&
    typeof obj.explanation === "string" &&
    Array.isArray(obj.recommendations) &&
    obj.recommendations.every((rec: unknown) => typeof rec === "string")
  );
}

function buildAnalysisPrompt(input: GroqAnalysisInput): string {
  const { profile, adaptiveContract, observedEvidence } = input;
  
  return `You are a senior performance and resilience engineer analyzing a web application test result.

Test Profile: ${profile.toUpperCase()}
Adaptive Contract:
- Network Profile: ${adaptiveContract.networkProfile}
- Image Policy: ${adaptiveContract.imagePolicy}
- JavaScript Policy: ${adaptiveContract.javascriptPolicy}
- Feature Policy: ${adaptiveContract.featurePolicy}
- Max Resource Size: ${adaptiveContract.maxResourceSizeKb} KB
- Max LCP: ${adaptiveContract.maxLcpMs} ms

Observed Evidence:
- Resource Count: ${observedEvidence.resourceCount}
- LCP: ${observedEvidence.metrics.lcpMs ?? "N/A"} ms
- CLS: ${observedEvidence.metrics.cls ?? "N/A"}
- FCP: ${observedEvidence.metrics.fcpMs ?? "N/A"} ms
- JS Transferred: ${observedEvidence.metrics.javascriptTransferBytes ? Math.round(observedEvidence.metrics.javascriptTransferBytes / 1024) + " KB" : "N/A"}
- Image Transferred: ${observedEvidence.metrics.imageTransferBytes ? Math.round(observedEvidence.metrics.imageTransferBytes / 1024) + " KB" : "N/A"}
- Total Transferred: ${observedEvidence.metrics.totalTransferBytes ? Math.round(observedEvidence.metrics.totalTransferBytes / 1024) + " KB" : "N/A"}

Violations (${observedEvidence.violations.length}):
${observedEvidence.violations.map((v, i) => 
  `${i + 1}. ${v.type} (Severity: ${v.severity})
   Expected: ${v.expected}
   Actual: ${v.actual}
   Message: ${v.message}`
).join("\n")}

Provide a concise analysis in JSON format with this exact structure:
{
  "summary": "Brief 1-2 sentence summary of the test result",
  "rootCause": "Primary cause of any violations or performance issues",
  "impact": "Business or user experience impact",
  "explanation": "Technical explanation of what happened and why",
  "recommendations": ["Specific actionable recommendation 1", "Specific actionable recommendation 2"]
}

Keep responses factual and actionable. Do not fabricate data not present in the evidence.`;
}

export async function analyzeWithGroq(input: GroqAnalysisInput): Promise<GroqAnalysisResult> {
  if (!validateGroqConfig()) {
    return { error: "Groq API is not configured", unavailable: true };
  }

  try {
    const prompt = buildAnalysisPrompt(input);
    
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a senior performance engineer. Always respond with valid JSON only, no markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, "Groq API error");
      return { error: `Groq API returned ${response.status}`, unavailable: true };
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return { error: "Invalid response from Groq API", unavailable: true };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { error: "Failed to parse Groq response as JSON", unavailable: true };
    }

    if (!validateAnalysisOutput(parsed)) {
      return { error: "Groq response does not match expected schema", unavailable: true };
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error }, "Groq analysis failed");
    return { error: message, unavailable: true };
  }
}
