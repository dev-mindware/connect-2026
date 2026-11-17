import { z } from 'zod';

try {
  process.loadEnvFile();
} catch {
  // Em produção/container as variáveis vêm do ambiente
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3030),
  MAX_REGISTRATIONS: z.coerce.number().int().min(1).default(200),
  FRONTEND_URL: z.string().default('http://localhost:5173,http://localhost:3000'),
  PUBLIC_FRONTEND_URL: z.string().default(''),
  DATABASE_URL: z.string().default(''),
  TICKET_SECRET: z
    .string()
    .default('connect-2026-dev-secret-key-change-in-production'),
  ADMIN_API_KEY: z.string().default(''),
  RESEND_API_KEY: z.string().default(''),
  RESEND_FROM_EMAIL: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(['true', 'false', '1', '0', ''])
    .default('false')
    .transform((value) => value === 'true' || value === '1'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Configuração de ambiente inválida: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  return parsed.data;
}
