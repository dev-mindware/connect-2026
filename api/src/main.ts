import { createApp } from './app';
import { loadEnv } from './config/env';
import { createPrismaClient } from './prisma';
import { createPrismaRegistrationRepository } from './repositories/registration.repository';
import { createMailService } from './services/mail.service';

async function bootstrap() {
  const env = loadEnv();
  const db = createPrismaClient(env.DATABASE_URL);
  const repository = createPrismaRegistrationRepository(db.prisma);
  const mailService = createMailService(env);

  const app = createApp({ env, repository, mailService });

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.info(
      `Connect 2026 API activa na porta ${env.PORT} (MAX_REGISTRATIONS=${env.MAX_REGISTRATIONS})`,
    );
  });

  const shutdown = async (signal: string) => {
    console.info(`Sinal ${signal} recebido. A encerrar graciosamente...`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar a Connect 2026 API:', err);
  process.exit(1);
});
