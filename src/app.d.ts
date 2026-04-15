declare global {
  namespace App {
    interface Locals {
      user: { id: string; email: string; username: string } | null;
    }
    interface Platform {
      env: {
        DB: D1Database;
        BUCKET: R2Bucket;
        RESEND_API_KEY: string;
        JWT_SECRET: string;
        BASE_URL: string;
        RESEND_FROM: string;
        GITHUB_CLIENT_ID: string;
        GITHUB_CLIENT_SECRET: string;
        GOOGLE_CLIENT_ID: string;
        GOOGLE_CLIENT_SECRET: string;
      };
    }
  }
}

export {};
