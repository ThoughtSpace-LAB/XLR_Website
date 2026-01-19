#!/bin/bash

# --- 1. 设置变量 (请替换为你的实际值) ---
# [必填] 你的 GCP 项目 ID
export PROJECT_ID="vpn-felix"

# [必填] 你的 GCP 项目编号 (Dashboard 首页可见的纯数字)
export PROJECT_NUMBER="822219439970"

# [可选] 你的 Cloud Run 服务名称 (从你的 URL https://sfc-adk-... 推测是 sfc-adk)
export RUN_SERVICE_NAME="sfc-adk"

# [可选] 你的 Cloud Run 部署区域 (从你的 URL ...asia-east1... 推测是 asia-east1)
export RUN_REGION="asia-east1"

export SA_NAME="cloudflare-invoker"
export POOL_NAME="cloudflare-pool"
export PROVIDER_NAME="cloudflare-oidc"

if [ -z "$PROJECT_ID" ]; then
  echo "请先设置 PROJECT_ID 环境变量 (ex: export PROJECT_ID='my-project')"
  exit 1
fi

if [ -z "$PROJECT_NUMBER" ]; then
  echo "请先设置 PROJECT_NUMBER 环境变量 (ex: export PROJECT_NUMBER='123456789')"
  exit 1
fi

# --- 2. 创建服务账号 (Service Account) ---
gcloud iam service-accounts create $SA_NAME --display-name="Cloudflare Invoker" --project=$PROJECT_ID

# --- 3. 授予权限 (允许该账号调用 Cloud Run) ---
# 允许调用 Cloud Run
gcloud run services add-iam-policy-binding $RUN_SERVICE_NAME \
  --region=$RUN_REGION \
  --member="serviceAccount:$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID

# 允许生成 ID Token (关键！否则 STS 换不到 Token)
gcloud iam service-accounts add-iam-policy-binding \
  $SA_NAME@$PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.serviceAccountTokenCreator" \
  --member="serviceAccount:$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
  --project=$PROJECT_ID

# --- 4. 创建 Workload Identity Pool ---
gcloud iam workload-identity-pools create $POOL_NAME \
  --location="global" \
  --display-name="Cloudflare Pool" \
  --project=$PROJECT_ID

# --- 5. 创建 OIDC Provider ---
# 注意：attribute-mapping 决定了 Cloudflare 的哪些信息会被 GCP 接收
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
  --location="global" \
  --workload-identity-pool=$POOL_NAME \
  --display-name="Cloudflare OIDC" \
  --issuer-uri="https://workers.cloudflare.com" \
  --allowed-audiences="gcp-cloud-run" \
  --attribute-mapping="google.subject=assertion.sub,attribute.aud=assertion.aud" \
  --project=$PROJECT_ID

# --- 6. 绑定 Pool 到 Service Account ---
# 这步打通了 "Cloudflare Pool" -> "GCP Service Account" 的桥梁
gcloud iam service-accounts add-iam-policy-binding \
  $SA_NAME@$PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_NAME/*" \
  --project=$PROJECT_ID

echo "✅ GCP 配置完成！"
