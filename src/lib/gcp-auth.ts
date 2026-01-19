interface GcpConfig {
  projectNumber: string;
  poolId: string;
  providerId: string;
  serviceAccountEmail: string;
}

/**
 * 核心逻辑：用 Cloudflare 的 JWT 换取 Google 的 ID Token
 */
export async function getGcpIdToken(
  env: any, // 传入 Cloudflare 的 env 变量
  targetAudience: string // 你的 Cloud Run URL
): Promise<string> {
  
  // 1. 获取 Cloudflare OIDC Token
  // 注意：audience 必须和 GCP OIDC Provider 设置的一致
  // @ts-ignore - Workers runtime specific
  const cfToken = await env.Fetcher.fetch("https://workers.cloudflare.com/oidc/token", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ aud: "gcp-cloud-run" })
  }).then((r: any) => r.json()).then((d: any) => d.token);

  if (!cfToken) throw new Error("无法获取 Cloudflare OIDC Token");

  // 2. 准备 STS 交换参数
  // 这是最长、最容易拼错的字符串，请仔细检查
  const audience = `//iam.googleapis.com/projects/${env.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${env.GCP_POOL_ID}/providers/${env.GCP_PROVIDER_ID}`;
  
  // 3. 请求 Google STS (Security Token Service)
  const stsResp = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: audience, // WIF Pool 的资源名
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requestedTokenType: "urn:ietf:params:oauth:token-type:access_token", // 先换取临时访问令牌
      subjectToken: cfToken,
      subjectTokenType: "urn:ietf:params:oauth:token-type:jwt"
    })
  });

  const stsData = (await stsResp.json()) as any;
  if (!stsData.access_token) {
    console.error("STS Error:", stsData);
    throw new Error(`STS 交换失败: ${stsData.error_description || "未知错误"}`);
  }

  // 4. (关键一步) 用 STS 返回的 Federation Token 换取 Service Account 的 ID Token
  // 因为 Cloud Run 需要 ID Token (OpenID Connect)，而不是普通的 IAM Access Token
  const saResp = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${env.GCP_SA_EMAIL}:generateIdToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${stsData.access_token}` // 使用刚才的 STS Token
      },
      body: JSON.stringify({
        audience: targetAudience, // 这里填 Cloud Run 的 URL
        includeEmail: true
      })
    }
  );

  const saData = (await saResp.json()) as any;
  return saData.token;
}
