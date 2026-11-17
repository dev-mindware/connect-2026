import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export interface DatabaseClient {
  prisma: PrismaClient;
  close: () => Promise<void>;
}

export function createPrismaClient(connectionString: string): DatabaseClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    close: async () => {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}
