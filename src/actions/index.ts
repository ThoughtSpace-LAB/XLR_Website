import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { randomUUID } from "node:crypto";
import { callAdkAgent, callSfcAgent, initSfcSession } from "./adk";

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
      // 1. 获取环境变量 (兼容 Cloudflare Runtime 和 构建时变量)
      // 注意：context.locals 只能在 SSR 模式下获取到，如果是纯静态构建可能会出错，需要确保 adapter 模式正确
      const env = context.locals?.runtime?.env || import.meta.env;

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
        
        // ZORA uses a simpler format: "num1 num2 gender question"
        const genderText = input.gender === "male" ? "男" : "女";
        const zoraPrompt = `${input.num1} ${input.num2} ${genderText} ${input.question}`;

        // ZORA doesn't need session initialization, call API directly
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
};
