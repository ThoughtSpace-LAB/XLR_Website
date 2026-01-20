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
