import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import type { AppEnv } from './config/env';
import type {
  CheckInOutcome,
  CreateRegistrationOutcome,
  CreateRegistrationParams,
  EmailStatus,
  RegistrationRecord,
  RegistrationRepository,
} from './repositories/registration.repository';
import { formatSenderAddress, type MailService } from './services/mail.service';

function createTestEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    NODE_ENV: 'test',
    PORT: 3030,
    MAX_REGISTRATIONS: 2,
    FRONTEND_URL: 'http://localhost:5173',
    PUBLIC_FRONTEND_URL: '',
    PUBLIC_API_URL: '',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    TICKET_SECRET: 'test-ticket-secret-with-more-than-32-characters',
    ADMIN_API_KEY: 'test-admin-api-key',
    RESEND_API_KEY: '',
    RESEND_FROM_EMAIL: '',
    SMTP_HOST: '',
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: '',
    ...overrides,
  };
}

function createInMemoryRepository(): RegistrationRepository {
  const items: RegistrationRecord[] = [];

  return {
    async ping() {
      return true;
    },
    async count() {
      return items.length;
    },
    async createWithCapacity(
      params: CreateRegistrationParams,
    ): Promise<CreateRegistrationOutcome> {
      const existing = items.find(
        (item) =>
          item.email === params.email || item.whatsapp === params.whatsapp,
      );
      if (existing) {
        return {
          ok: false,
          reason:
            existing.email === params.email
              ? 'DUPLICATE_EMAIL'
              : 'DUPLICATE_WHATSAPP',
        };
      }

      if (items.length >= params.maxRegistrations) {
        return { ok: false, reason: 'CAPACITY_REACHED' };
      }

      const record: RegistrationRecord = {
        id: `reg_${items.length + 1}`,
        fullName: params.fullName,
        address: params.address,
        email: params.email,
        whatsapp: params.whatsapp,
        ticketCode: params.ticketCode,
        qrToken: params.qrToken,
        emailStatus: 'PENDING',
        emailError: null,
        checkedInAt: null,
        createdAt: new Date(),
      };
      items.push(record);
      return { ok: true, registration: record };
    },
    async findByTicketCode(ticketCode: string) {
      return items.find((item) => item.ticketCode === ticketCode) ?? null;
    },
    async updateEmailStatus(
      id: string,
      status: EmailStatus,
      error: string | null = null,
    ) {
      const target = items.find((item) => item.id === id);
      if (target) {
        target.emailStatus = status;
        target.emailError = error;
      }
    },
    async markCheckedIn(ticketCode: string): Promise<CheckInOutcome> {
      const target = items.find((item) => item.ticketCode === ticketCode);
      if (!target) {
        return { ok: false, reason: 'NOT_FOUND' };
      }
      if (target.checkedInAt) {
        return {
          ok: false,
          reason: 'ALREADY_CHECKED_IN',
          checkedInAt: target.checkedInAt,
          registration: target,
        };
      }
      target.checkedInAt = new Date();
      return { ok: true, registration: target };
    },
  };
}

describe('Connect 2026 API', () => {
  it('responde 200 na raiz para healthcheck Docker e calcula vagas em /api/status', async () => {
    const repository = createInMemoryRepository();
    const mailService: MailService = {
      sendInvitation: vi.fn().mockResolvedValue({ status: 'SENT', provider: 'resend' }),
    };
    const app = createApp({
      env: createTestEnv({ MAX_REGISTRATIONS: 5 }),
      repository,
      mailService,
    });

    const rootRes = await request(app).get('/');
    expect(rootRes.status).toBe(200);
    expect(rootRes.body.status).toBe('ok');

    const statusRes = await request(app).get('/api/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body).toMatchObject({
      maxRegistrations: 5,
      registeredCount: 0,
      remainingSpots: 5,
      isFull: false,
    });
  });

  it('regista participante, normaliza WhatsApp angolano, gera QR Code e envia e-mail', async () => {
    const repository = createInMemoryRepository();
    const sendInvitation = vi
      .fn()
      .mockResolvedValue({ status: 'SENT', provider: 'resend' });
    const app = createApp({
      env: createTestEnv({ MAX_REGISTRATIONS: 2 }),
      repository,
      mailService: { sendInvitation },
    });

    const res = await request(app).post('/api/registrations').send({
      fullName: 'Ana Paula Manuel',
      address: 'Viana, Luanda',
      email: 'Ana@Example.com',
      whatsapp: '934 242 419',
      website: '',
    });

    expect(res.status).toBe(201);
    expect(res.body.registration.email).toBe('ana@example.com');
    expect(res.body.registration.whatsapp).toBe('+244934242419');
    expect(res.body.registration.ticketCode).toMatch(/^C26-[A-Z0-9]{6}$/);
    expect(res.body.registration.qrUrl).toBe(
      `http://localhost:5173/convite?token=${encodeURIComponent(res.body.registration.qrToken)}`,
    );
    expect(res.body.registration.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.registration.emailStatus).toBe('SENT');
    expect(sendInvitation).toHaveBeenCalledTimes(1);
    const mailCall = sendInvitation.mock.calls[0]?.[0];
    expect(mailCall?.pdfBuffer?.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(mailCall?.pdfUrl).toContain('download=pdf');
  });

  it('impede inscrições duplicadas e respeita o limite MAX_REGISTRATIONS', async () => {
    const repository = createInMemoryRepository();
    const mailService: MailService = {
      sendInvitation: vi.fn().mockResolvedValue({ status: 'SKIPPED', provider: 'none' }),
    };
    const app = createApp({
      env: createTestEnv({ MAX_REGISTRATIONS: 1 }),
      repository,
      mailService,
    });

    const first = await request(app).post('/api/registrations').send({
      fullName: 'Primeiro Inscrito',
      email: 'um@example.com',
      whatsapp: '+244911111111',
    });
    expect(first.status).toBe(201);

    const dupEmail = await request(app).post('/api/registrations').send({
      fullName: 'Outro Nome',
      email: 'um@example.com',
      whatsapp: '+244922222222',
    });
    expect(dupEmail.status).toBe(409);
    expect(dupEmail.body.error).toBe('DUPLICATE_EMAIL');

    const full = await request(app).post('/api/registrations').send({
      fullName: 'Segundo Inscrito',
      email: 'dois@example.com',
      whatsapp: '+244933333333',
    });
    expect(full.status).toBe(409);
    expect(full.body.error).toBe('CAPACITY_REACHED');
  });

  it('valida QR Code assinado no check-in e bloqueia segunda leitura', async () => {
    const repository = createInMemoryRepository();
    const mailService: MailService = {
      sendInvitation: vi.fn().mockResolvedValue({ status: 'SKIPPED', provider: 'none' }),
    };
    const app = createApp({
      env: createTestEnv({ MAX_REGISTRATIONS: 10 }),
      repository,
      mailService,
    });

    const created = await request(app).post('/api/registrations').send({
      fullName: 'Carlos Mateus',
      email: 'carlos@example.com',
      whatsapp: '+244923000111',
    });

    const qrToken: string = created.body.registration.qrToken;

    const unauth = await request(app).post('/api/checkin').send({ qrToken });
    expect(unauth.status).toBe(401);

    const tampered = await request(app)
      .post('/api/checkin')
      .set('x-admin-api-key', 'test-admin-api-key')
      .send({ qrToken: 'C26-AAAAAA.invalid' });
    expect(tampered.status).toBe(400);

    const okCheckin = await request(app)
      .post('/api/checkin')
      .set('x-admin-api-key', 'test-admin-api-key')
      .send({ qrToken });
    expect(okCheckin.status).toBe(200);
    expect(okCheckin.body.attendee.fullName).toBe('Carlos Mateus');

    const secondCheckin = await request(app)
      .post('/api/checkin')
      .set('x-admin-api-key', 'test-admin-api-key')
      .send({ qrToken });
    expect(secondCheckin.status).toBe(409);
    expect(secondCheckin.body.error).toBe('ALREADY_CHECKED_IN');
  });

  it('rejeita submissões com campo honeypot preenchido', async () => {
    const repository = createInMemoryRepository();
    const mailService: MailService = {
      sendInvitation: vi.fn(),
    };
    const app = createApp({
      env: createTestEnv(),
      repository,
      mailService,
    });

    const res = await request(app).post('/api/registrations').send({
      fullName: 'Bot Automático',
      email: 'bot@example.com',
      whatsapp: '+244999999999',
      website: 'https://spam.invalid',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('BOT_DETECTED');
  });

  it('expõe a especificação OpenAPI e a documentação Scalar em /api/docs', async () => {
    const repository = createInMemoryRepository();
    const mailService: MailService = {
      sendInvitation: vi.fn(),
    };
    const app = createApp({
      env: createTestEnv(),
      repository,
      mailService,
    });

    const specRes = await request(app).get('/api/openapi.json');
    expect(specRes.status).toBe(200);
    expect(specRes.body.openapi).toBe('3.1.0');
    expect(specRes.body.paths['/api/registrations']).toBeDefined();

    const docsRes = await request(app).get('/api/docs');
    expect(docsRes.status).toBe(200);
    expect(docsRes.headers['content-type']).toContain('text/html');
    expect(docsRes.text).toContain('/api/openapi.json');
  });

  it('devolve os dados do inscrito em /api/tickets/verify e aceita URL completo no check-in', async () => {
    const repository = createInMemoryRepository();
    const mailService: MailService = {
      sendInvitation: vi.fn().mockResolvedValue({ status: 'SKIPPED', provider: 'none' }),
    };
    const app = createApp({
      env: createTestEnv({
        MAX_REGISTRATIONS: 10,
        PUBLIC_FRONTEND_URL: 'https://connect.exemplo.com',
      }),
      repository,
      mailService,
    });

    const created = await request(app).post('/api/registrations').send({
      fullName: 'Joana Pedro',
      address: 'Kilamba, Luanda',
      email: 'joana@example.com',
      whatsapp: '923456789',
    });

    const { qrToken, qrUrl } = created.body.registration as {
      qrToken: string;
      qrUrl: string;
    };
    expect(qrUrl.startsWith('https://connect.exemplo.com/convite?token=')).toBe(
      true,
    );

    const verifyRes = await request(app).get(
      `/api/tickets/verify?token=${encodeURIComponent(qrToken)}`,
    );
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.registration).toMatchObject({
      fullName: 'Joana Pedro',
      address: 'Kilamba, Luanda',
      email: 'joana@example.com',
      whatsapp: '+244923456789',
      checkedInAt: null,
    });

    const invalidVerify = await request(app).get(
      '/api/tickets/verify?token=C26-AAAAAA.invalid',
    );
    expect(invalidVerify.status).toBe(400);

    const pdfRes = await request(app)
      .get(`/api/tickets/pdf?token=${encodeURIComponent(qrToken)}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfRes.headers['content-disposition']).toContain('attachment;');
    expect((pdfRes.body as Buffer).subarray(0, 5).toString('utf8')).toBe(
      '%PDF-',
    );

    const invalidPdf = await request(app).get(
      '/api/tickets/pdf?token=C26-AAAAAA.invalid',
    );
    expect(invalidPdf.status).toBe(400);

    const checkinByUrl = await request(app)
      .post('/api/checkin')
      .set('x-admin-api-key', 'test-admin-api-key')
      .send({ qrToken: qrUrl });
    expect(checkinByUrl.status).toBe(200);
    expect(checkinByUrl.body.attendee.fullName).toBe('Joana Pedro');
  });

  it('formata o nome do remetente como Connect 2026 quando só há endereço de e-mail', () => {
    expect(formatSenderAddress('no-reply@mindware.ao')).toBe(
      'Connect 2026 <no-reply@mindware.ao>',
    );
    expect(
      formatSenderAddress('Connect 2026 <no-reply@mindware.ao>'),
    ).toBe('Connect 2026 <no-reply@mindware.ao>');
  });
});
