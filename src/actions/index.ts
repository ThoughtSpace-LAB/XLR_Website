import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { randomUUID } from "node:crypto";

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
      const item = payload[i] as { content?: { parts?: Array<{ text?: string }> } };
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
    const content = obj.content as { parts?: Array<{ text?: string }> } | undefined;
    if (Array.isArray(content?.parts)) {
      const textPart = content.parts.find((part) => typeof part?.text === "string");
      if (textPart?.text) return textPart.text;
    }
  }

  return null;
};

export const server = {
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
    }),
    handler: async (input) => {
      const appUrl =
        (import.meta.env.SFC_APP_URL as string | undefined) ??
        (import.meta.env.APP_URL as string | undefined);
      if (!appUrl) {
        throw new Error("SFC_APP_URL is not configured.");
      }

      const nonce = randomUUID();
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

      const sessionResponse = await fetch(
        `${appUrl}/apps/${APP_NAME}/users/${userId}/sessions/${sessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preferred_language: input.preferredLanguage,
            visit_count: input.visitCount,
          }),
        }
      );

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        throw new Error(`Session init failed: ${errorText}`);
      }

      const runResponse = await fetch(`${appUrl}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_name: APP_NAME,
          user_id: userId,
          session_id: sessionId,
          new_message: {
            role: "user",
            parts: [{ text: prompt }],
          },
          streaming: false,
        }),
      });

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        throw new Error(`Run failed: ${errorText}`);
      }

      const payload = (await runResponse.json()) as unknown;
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
