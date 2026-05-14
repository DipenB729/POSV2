import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PHONEPE_MERCHANT_ID: z.string().min(1),
  PHONEPE_SALT_KEY: z.string().min(1),
  PHONEPE_SALT_INDEX: z.coerce.number().int().positive(),
  PHONEPE_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_BUCKET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
