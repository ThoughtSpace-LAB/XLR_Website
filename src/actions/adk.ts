import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { getGcpIdToken } from '../lib/gcp-auth';

export const callAdkAgent = defineAction({
  input: z.object({
    command: z.string(), // 假设你要发给 Agent 的指令
  }),
  handler: async (input, context) => {
    // 从 Cloudflare 上下文中获取环境变量
    const env = context.locals.runtime.env; 
    const cloudRunUrl = env.GCP_CLOUD_RUN_URL;

    try {
      console.log("正在进行身份认证...");
      // 1. 获取谷歌 ID Token
      const googleIdToken = await getGcpIdToken(env, cloudRunUrl as string);

      console.log("认证成功，正在调用 Cloud Run...");
      // 2. 调用 Cloud Run
      const response = await fetch(`${cloudRunUrl}/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 这里的 Bearer Token 是 Google 签发的合法 ID Token
          "Authorization": `Bearer ${googleIdToken}` 
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
         throw new Error(`Agent 返回错误: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error: any) {
      console.error(error);
      return { success: false, error: error.message };
    }
  }
});
