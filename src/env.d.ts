/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  IMAGES: R2Bucket;
  SEND_EMAIL: SendEmail;
  FROM_PHONE: string;
  FROM_EMAIL: string;
  APP_URL: string;
  TELNYX_API_KEY: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {}
}
