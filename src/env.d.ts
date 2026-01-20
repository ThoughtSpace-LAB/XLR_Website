// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite/client" />
/// <reference types="../vendor/integration/types.d.ts" />

interface Env {
  GCP_PROJECT_NUMBER: string;
  GCP_POOL_ID: string;
  GCP_PROVIDER_ID: string;
  GCP_SA_EMAIL: string;
  GCP_CLOUD_RUN_URL: string;
  SFC_APP_URL?: string;
  APP_URL?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    user: {
      name: string;
      surname: string;
    };
  }
}
