/**
 * GeminiClient — thin wrapper around @google/generative-ai for noter.
 *
 * BYOK: the user provides their own Gemini API key in the plugin settings.
 * No server proxy, no rate-limiting middleman — requests go directly to
 * Google's generativelanguage.googleapis.com from the Obsidian client.
 */

import {
  GoogleGenerativeAI,
  type GenerateContentRequest,
  type Part,
} from "@google/generative-ai";
import { extractGeminiText } from "@/lib/format";

export const GEMINI_MODEL = "gemini-2.5-flash";

export interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface TextCallArgs {
  apiKey: string;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
}

export interface MultimodalCallArgs {
  apiKey: string;
  system: string;
  /** Text portion of the prompt (can be empty). */
  prompt: string;
  /** Raw audio bytes + MIME type for transcription requests. */
  audioParts: AudioPart[];
  maxOutputTokens?: number;
}

export interface AudioPart {
  /** Raw bytes of the audio chunk. */
  data: Uint8Array;
  /** e.g. "audio/webm", "audio/mp4", "audio/wav" */
  mimeType: string;
}

export interface GeminiResponse {
  text: string;
  usage?: GeminiUsage;
}

// ─── Text generation ──────────────────────────────────────────────────────────

/**
 * Sends a text-only request to Gemini (lesson block generation, concept
 * extraction, dedup, summary).
 */
export async function callGeminiText({
  apiKey,
  system,
  prompt,
  maxOutputTokens = 8192,
}: TextCallArgs): Promise<GeminiResponse> {
  assertApiKey(apiKey);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: system,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens },
  } satisfies GenerateContentRequest);

  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    text,
    usage: usage
      ? {
          promptTokenCount: usage.promptTokenCount,
          candidatesTokenCount: usage.candidatesTokenCount,
          totalTokenCount: usage.totalTokenCount,
        }
      : undefined,
  };
}

// ─── Multimodal (audio) transcription ────────────────────────────────────────

/**
 * Sends audio bytes + optional text to Gemini for transcription.
 * Audio is base64-encoded inline (no Files API required for chunks < ~20 MB).
 */
export async function callGeminiMultimodal({
  apiKey,
  system,
  prompt,
  audioParts,
  maxOutputTokens = 8192,
}: MultimodalCallArgs): Promise<GeminiResponse> {
  assertApiKey(apiKey);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: system,
  });

  const parts: Part[] = [
    ...audioParts.map(({ data, mimeType }) => ({
      inlineData: {
        data: uint8ArrayToBase64(data),
        mimeType,
      },
    })),
    ...(prompt.trim() ? [{ text: prompt }] : []),
  ];

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens },
  } satisfies GenerateContentRequest);

  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    text,
    usage: usage
      ? {
          promptTokenCount: usage.promptTokenCount,
          candidatesTokenCount: usage.candidatesTokenCount,
          totalTokenCount: usage.totalTokenCount,
        }
      : undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertApiKey(apiKey: string): void {
  if (!apiKey?.trim()) {
    throw new Error(
      "Gemini API key is not set. Please add your key in Noter settings."
    );
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

// Re-export the text extractor for callers that work with raw API responses.
export { extractGeminiText };
