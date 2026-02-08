import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { randomUUID } from "node:crypto";
import { callAdkAgent, callSfcAgent, initSfcSession, initZoraSession } from "./adk";

const APP_NAME = "SFC_agent";

const buildPrompt = (input: {
  num1: string;
  num2: string;
  time: string;
  gender: "female" | "male";
  question: string;
}) => {
  const genderText = input.gender === "female" ? "女生" : "男生";
  const question = input.question.trim();
  return `${input.num1}，${input.num2}，${input.time}点，${genderText}，${question}`;
};

const extractModelText = (payload: unknown): string | null => {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    for (let i = payload.length - 1; i >= 0; i -= 1) {
      const item = payload[i] as {
        content?: { parts?: Array<{ text?: string }> };
      };
      const parts = item?.content?.parts;
      if (Array.isArray(parts)) {
        const textPart = parts.find((part) => typeof part?.text === "string");
        if (textPart?.text) return textPart.text;
      }
    }
    return null;
  }

  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.output_text === "string") return obj.output_text;
    if (Array.isArray(obj.messages)) return extractModelText(obj.messages);
    if (Array.isArray(obj.output)) return extractModelText(obj.output);
    if (Array.isArray(obj.candidates)) return extractModelText(obj.candidates);
    const content = obj.content as
      | { parts?: Array<{ text?: string }> }
      | undefined;
    if (Array.isArray(content?.parts)) {
      const textPart = content.parts.find(
        (part) => typeof part?.text === "string",
      );
      if (textPart?.text) return textPart.text;
    }
  }

  return null;
};

export const server = {
  callAdkAgent,
  generateRevelation: defineAction({
    input: z.object({
      num1: z.string().min(1),
      num2: z.string().min(1),
      time: z.string().min(1),
      gender: z.enum(["female", "male"]),
      question: z.string().min(1),
      email: z.string().email().optional(),
      preferredLanguage: z.string().default("English"),
      visitCount: z.number().int().min(1).default(1),
      model: z.enum(["luca", "zora"]).default("luca"), // Model selection
      // idToken: z.string().optional(), // .min(1, "Google ID Token is required"), // 暂时注释掉
    }),
    handler: async (input, context) => {
      // 1. 获取环境变量 (使用 import.meta.env 兼容 Vercel)
      const env = import.meta.env;

      const nonce = randomUUID();

      // ZORA uses a different endpoint and format
      if (input.model === "zora") {
        const zoraApiUrl =
          env.ZORA_APP_URL ||
          (import.meta.env.ZORA_APP_URL as string | undefined) ||
          "https://sfc-adk-ly-822219439970.asia-east1.run.app"; // fallback
        
        // ZORA uses short prefixes
        const userId = input.email
          ? `u_${input.email.replace(/[^a-zA-Z0-9]/g, "_")}`
          : `u_${nonce}`;
        const sessionId = `s_${nonce}`;
        
        // ZORA format: uses Chinese punctuation like LUCA
        const genderText = input.gender === "male" ? "男生" : "女生";
        const zoraPrompt = `${input.num1}，${input.num2}，${input.time}点，${genderText}，${input.question.trim()}`;

        // Initialize ZORA session before calling API
        await initZoraSession({
          apiUrl: zoraApiUrl,
          appName: APP_NAME,
          userId,
          sessionId,
          preferredLanguage: input.preferredLanguage || "Chinese",
          visitCount: input.visitCount,
        });

        // Call ZORA API
        const payload = await callSfcAgent({
          apiUrl: zoraApiUrl,
          appName: APP_NAME,
          userId,
          sessionId,
          prompt: zoraPrompt,
          useSnakeCase: false, // ZORA uses camelCase
        });

        const text = extractModelText(payload)?.trim() ?? "";

        if (!text) {
          throw new Error("ZORA returned an empty response.");
        }

        return {
          text,
          raw: payload,
        };
      }

      // LUCA model (original logic)
      const appUrl =
        env.SFC_APP_URL ||
        env.APP_URL ||
        (import.meta.env.SFC_APP_URL as string | undefined) ||
        (import.meta.env.APP_URL as string | undefined);

      if (!appUrl) {
        throw new Error("SFC_APP_URL is not configured.");
      }

      // LUCA uses full prefixes
      const userId = input.email
        ? `user_${input.email.replace(/[^a-zA-Z0-9]/g, "_")}`
        : `user_${nonce}`;
      const sessionId = `session_${nonce}`;

      const prompt = buildPrompt({
        num1: input.num1,
        num2: input.num2,
        time: input.time,
        gender: input.gender,
        question: input.question,
      });

      // Initialize session for LUCA
      await initSfcSession({
        apiUrl: appUrl,
        appName: APP_NAME,
        userId,
        sessionId,
        preferredLanguage: input.preferredLanguage,
        visitCount: input.visitCount,
      });

      // Call LUCA API
      const payload = await callSfcAgent({
        apiUrl: appUrl,
        appName: APP_NAME,
        userId,
        sessionId,
        prompt,
        useSnakeCase: true, // LUCA uses snake_case
      });

      const text = extractModelText(payload)?.trim() ?? "";

      if (!text) {
        throw new Error("Model returned an empty response.");
      }

      return {
        text,
        raw: payload,
      };
    },
  }),
  translate: defineAction({
    input: z.object({
      texts: z.array(z.string()),
      targetLang: z.string(),
    }),
    handler: async ({ texts, targetLang }) => {
      const apiKey = import.meta.env.GOOGLE_TRANSLATE_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_TRANSLATE_API_KEY is not configured.");
      }

      // Google Translate API v2
      // const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

      try {
        // Increase default timeout for fetch if running locally behind proxies
        // Or simply use standard fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s backend timeout

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: texts,
            target: targetLang,
            format: "text", // or 'html' if we want to preserve formatting, but input is markdown/text
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Translation API failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        // Response format: { data: { translations: [ { translatedText: "..." }, ... ] } }
        
        const translations = data.data.translations.map((t: any) => t.translatedText);
        return { translations };
        
      } catch (error) {
        console.error("Translation error:", error);
        // Fallback: return original texts marked as failed (or throw to let UI handle)
        // Throwing allows the client to decide whether to show original or error.
        throw error;
      }
    },
  }),
};
