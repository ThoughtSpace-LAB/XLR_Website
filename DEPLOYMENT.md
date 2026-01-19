# 部署到 Cloudflare Pages 指南

## 方式一：使用 Cloudflare Dashboard（推荐，最简单）

### 1. 提交代码到 GitHub

```bash
cd /Users/dev/serenafelix/XLR_Website

# 添加所有更改
git add .

# 提交
git commit -m "feat: 添加 GCP Cloud Run 集成和 OIDC 认证"

# 推送到 GitHub
git push origin add-Gemini-agent
```

### 2. 在 Cloudflare Dashboard 创建 Pages 项目

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
3. 选择你的 GitHub 仓库：`ThoughtSpace-LAB/XLR_Website`
4. 配置构建设置：
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
   - **Node version**: `20`

### 3. 配置环境变量

在 Cloudflare Pages 项目设置中添加以下环境变量（已在 wrangler.jsonc 中定义）：

```
GCP_PROJECT_NUMBER=822219439970
GCP_POOL_ID=cloudflare-pool
GCP_PROVIDER_ID=cloudflare-oidc
GCP_SA_EMAIL=cloudflare-invoker@vpn-felix.iam.gserviceaccount.com
GCP_CLOUD_RUN_URL=https://sfc-adk-822219439970.asia-east1.run.app
SFC_APP_URL=https://sfc-adk-822219439970.asia-east1.run.app
```

**注意**：环境变量需要在 Cloudflare Dashboard 的 **Settings** > **Environment variables** 中手动添加

### 4. 部署

- 点击 **Save and Deploy**
- Cloudflare 会自动构建并部署你的网站
- 部署完成后会得到一个 `*.pages.dev` 域名

---

## 方式二：使用 Wrangler CLI（命令行）

### 1. 安装 Wrangler

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 部署

```bash
cd /Users/dev/serenafelix/XLR_Website

# 构建项目
npm run build

# 使用 Wrangler 部署
npx wrangler pages deploy dist --project-name=xlr-website
```

---

## 方式三：使用 GitHub Actions（自动化 CI/CD）

已创建 `.github/workflows/deploy.yml` 配置文件。

### 设置步骤：

1. **获取 Cloudflare API Token**
   - 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - 创建新 Token，使用 "Edit Cloudflare Workers" 模板
   - 权限：Account > Cloudflare Pages > Edit

2. **获取 Cloudflare Account ID**
   - 在 Cloudflare Dashboard 右侧查看 Account ID

3. **添加 GitHub Secrets**
   - 进入 GitHub 仓库 > Settings > Secrets and variables > Actions
   - 添加以下 secrets：
     - `CLOUDFLARE_API_TOKEN`: 你的 Cloudflare API Token
     - `CLOUDFLARE_ACCOUNT_ID`: 你的 Cloudflare Account ID

4. **推送代码触发自动部署**
   ```bash
   git push origin add-Gemini-agent
   ```

---

## 验证 OIDC Token 流程

部署后，Cloudflare Workers 会自动提供 OIDC token：

1. **Cloudflare 提供 OIDC Token**
   - `env.Fetcher.fetch("https://workers.cloudflare.com/oidc/token")` 自动可用
   - Audience 已在代码中设置为 `gcp-cloud-run`

2. **GCP Workload Identity Federation**
   - 你的 Pool 和 Provider 已配置好
   - Service Account 权限已授权

3. **测试调用**
   - 部署后访问你的 Astro Actions 端点
   - 例如：`POST https://your-site.pages.dev/api/actions/generateRevelation`

---

## 故障排查

### 检查构建日志
在 Cloudflare Dashboard > Workers & Pages > 你的项目 > Deployments 查看构建日志

### 检查 Functions 日志
在 Cloudflare Dashboard > Workers & Pages > 你的项目 > Functions > Logs 查看运行时日志

### 常见问题

1. **环境变量未生效**
   - 确保在 Cloudflare Dashboard 添加了所有环境变量
   - 重新部署项目

2. **OIDC Token 获取失败**
   - 检查 `wrangler.jsonc` 中的 `compatibility_flags` 包含 `"nodejs_compat"`
   - 确认 Cloudflare Workers 已启用 OIDC 功能

3. **GCP 认证失败**
   - 验证 Workload Identity Pool 配置
   - 确认 Service Account 权限正确

---

## 推荐流程

**首次部署：使用方式一（Dashboard）**
- 最直观，适合快速验证
- 可以直接在 UI 中配置环境变量

**后续开发：使用方式三（GitHub Actions）**
- 自动化部署
- 每次 push 都会自动构建和部署

现在先提交代码然后使用方式一部署！
