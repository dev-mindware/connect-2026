import type { PrismaClient } from '@prisma/client';

export type EmailStatus = 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED';

export interface RegistrationRecord {
  id: string;
  fullName: string;
  address: string | null;
  email: string;
  whatsapp: string;
  ticketCode: string;
  qrToken: string;
  emailStatus: EmailStatus;
  emailError: string | null;
  checkedInAt: Date | null;
  createdAt: Date;
}

export interface CreateRegistrationParams {
  fullName: string;
  address: string | null;
  email: string;
  whatsapp: string;
  ticketCode: string;
  qrToken: string;
  maxRegistrations: number;
}

export type CreateRegistrationOutcome =
  | { ok: true; registration: RegistrationRecord }
  | {
      ok: false;
      reason: 'CAPACITY_REACHED' | 'DUPLICATE_EMAIL' | 'DUPLICATE_WHATSAPP';
    };

export type CheckInOutcome =
  | { ok: true; registration: RegistrationRecord }
  | { ok: false; reason: 'NOT_FOUND' }
  | {
      ok: false;
      reason: 'ALREADY_CHECKED_IN';
      checkedInAt: Date;
      registration: RegistrationRecord;
    };

export interface RegistrationRepository {
  ping: () => Promise<boolean>;
  count: () => Promise<number>;
  findAll: () => Promise<RegistrationRecord[]>;
  createWithCapacity: (
    params: CreateRegistrationParams,
  ) => Promise<CreateRegistrationOutcome>;
  findByTicketCode: (ticketCode: string) => Promise<RegistrationRecord | null>;
  updateEmailStatus: (
    id: string,
    status: EmailStatus,
    error?: string | null,
  ) => Promise<void>;
  markCheckedIn: (ticketCode: string) => Promise<CheckInOutcome>;
}

const ADVISORY_LOCK_KEY = 20260612;

export function createPrismaRegistrationRepository(
  prisma: PrismaClient,
): RegistrationRepository {
  return {
    async ping(): Promise<boolean> {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },

    async count(): Promise<number> {
      return prisma.registration.count();
    },

    async findAll(): Promise<RegistrationRecord[]> {
      return prisma.registration.findMany({
        orderBy: { createdAt: 'desc' },
      });
    },

    async createWithCapacity(
      params: CreateRegistrationParams,
    ): Promise<CreateRegistrationOutcome> {
      return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`;

        const existing = await tx.registration.findFirst({
          where: {
            OR: [{ email: params.email }, { whatsapp: params.whatsapp }],
          },
        });

        if (existing) {
          if (existing.email === params.email) {
            return { ok: false, reason: 'DUPLICATE_EMAIL' };
          }
          return { ok: false, reason: 'DUPLICATE_WHATSAPP' };
        }

        const total = await tx.registration.count();
        if (total >= params.maxRegistrations) {
          return { ok: false, reason: 'CAPACITY_REACHED' };
        }

        const created = await tx.registration.create({
          data: {
            fullName: params.fullName,
            address: params.address,
            email: params.email,
            whatsapp: params.whatsapp,
            ticketCode: params.ticketCode,
            qrToken: params.qrToken,
            emailStatus: 'PENDING',
          },
        });

        return { ok: true, registration: created };
      });
    },

    async findByTicketCode(
      ticketCode: string,
    ): Promise<RegistrationRecord | null> {
      return prisma.registration.findUnique({ where: { ticketCode } });
    },

    async updateEmailStatus(
      id: string,
      status: EmailStatus,
      error: string | null = null,
    ): Promise<void> {
      await prisma.registration.update({
        where: { id },
        data: { emailStatus: status, emailError: error },
      });
    },

    async markCheckedIn(ticketCode: string): Promise<CheckInOutcome> {
      return prisma.$transaction(async (tx) => {
        const record = await tx.registration.findUnique({
          where: { ticketCode },
        });

        if (!record) {
          return { ok: false, reason: 'NOT_FOUND' };
        }

        if (record.checkedInAt) {
          return {
            ok: false,
            reason: 'ALREADY_CHECKED_IN',
            checkedInAt: record.checkedInAt,
            registration: record,
          };
        }

        const updated = await tx.registration.update({
          where: { id: record.id },
          data: { checkedInAt: new Date() },
        });

        return { ok: true, registration: updated };
      });
    },
  };
}
