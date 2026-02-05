import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const callAdkAgent = defineAction({
  input: z.object({
    command: z.string(), // 假设你要发给 Agent 的指令
    // idToken: z.string().optional(), // 用户 Google ID Token
  }),
  handler: async (input, context) => {
    // 从 Cloudflare 上下文中获取环境变量
    const env = context.locals.runtime.env;
    const cloudRunUrl = env.GCP_CLOUD_RUN_URL;

    try {
      console.log("正在调用 Cloud Run...");
      
      // 使用前端传来的 ID Token，不做服务端验证，透传给 Cloud Run
      // const googleIdToken = input.idToken;

      const response = await fetch(`${cloudRunUrl}/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 这里的 Bearer Token 是用户前端传来的 ID Token
          // Authorization: `Bearer ${googleIdToken}`,
        },
        body: JSON.stringify({ command: input.command }),
      });

      if (!response.ok) {
        throw new Error(`Agent 返回错误: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      return { success: false, error: error.message };
    }
  },
});

// Generic SFC Agent caller for different models
export const callSfcAgent = async (params: {
  apiUrl: string;
  appName: string;
  userId: string;
  sessionId: string;
  prompt: string;
  useSnakeCase?: boolean; // LUCA uses snake_case, ZORA uses camelCase
}) => {
  const { apiUrl, appName, userId, sessionId, prompt, useSnakeCase = false } = params;

  try {
    console.log(`正在调用 SFC Agent API: ${apiUrl}/run`);

    const payload = useSnakeCase
      ? {
          app_name: appName,
          user_id: userId,
          session_id: sessionId,
          new_message: {
            role: "user",
            parts: [{ text: prompt }],
          },
          streaming: false,
        }
      : {
          appName,
          userId,
          sessionId,
          newMessage: {
            role: "user",
            parts: [{ text: prompt }],
          },
        };

    const response = await fetch(`${apiUrl}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SFC Agent API 调用失败: ${response.status}`, errorText);
      throw new Error(`API failed (${response.status}): ${errorText}`);
    }

    return await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("SFC Agent API error:", error);
    throw error;
  }
};

// Initialize session for LUCA model
export const initSfcSession = async (params: {
  apiUrl: string;
  appName: string;
  userId: string;
  sessionId: string;
  preferredLanguage?: string;
  visitCount?: number;
}) => {
  const { apiUrl, appName, userId, sessionId, preferredLanguage = "English", visitCount = 1 } = params;

  try {
    console.log(`正在初始化 Session: ${apiUrl}/apps/${appName}/users/${userId}/sessions/${sessionId}`);

    const response = await fetch(
      `${apiUrl}/apps/${appName}/users/${userId}/sessions/${sessionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferred_language: preferredLanguage,
          visit_count: visitCount,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Session 初始化失败:", response.status, errorText);
      throw new Error(`Session init failed (${response.status}): ${errorText}`);
    }

    console.log("Session 初始化成功");
    return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Session initialization error:", error);
    throw error;
  }
};
