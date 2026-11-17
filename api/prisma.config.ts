import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // Sem ficheiro .env (produção ou estágio de build): usa variáveis de ambiente
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
