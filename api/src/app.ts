import crypto from 'node:crypto';
import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { AppEnv } from './config/env';
import { buildOpenApiSpec } from './docs/openapi';
import type { RegistrationRepository } from './repositories/registration.repository';
import {
  checkinInputSchema,
  registrationInputSchema,
} from './schemas/registration.schema';
import type { MailService } from './services/mail.service';
import { generateInvitationPdfBuffer } from './services/pdf.service';
import {
  buildTicketQrUrl,
  createSignedTicket,
  renderQrAssets,
  resolveFrontendBaseUrl,
  verifyQrToken,
} from './services/ticket.service';

export interface AppDependencies {
  env: AppEnv;
  repository: RegistrationRepository;
  mailService: MailService;
}

function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function createApp({
  env,
  repository,
  mailService,
}: AppDependencies): Express {
  const app = express();
  app.set('trust proxy', 1);

  const allowedOrigins = parseAllowedOrigins(env.FRONTEND_URL);
  const frontendBaseUrl = resolveFrontendBaseUrl(
    env.PUBLIC_FRONTEND_URL,
    env.FRONTEND_URL,
  );
  const publicApiBaseUrl = (env.PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const buildPdfDownloadUrl = (qrToken: string, qrUrl: string): string =>
    publicApiBaseUrl
      ? `${publicApiBaseUrl}/api/tickets/pdf?token=${encodeURIComponent(qrToken)}`
      : `${qrUrl}&download=pdf`;
  const openApiSpec = buildOpenApiSpec(env.PORT);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'", 'https://proxy.scalar.com'],
        },
      },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes('*')) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origem não autorizada pelo CORS.'));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-admin-api-key'],
    }),
  );
  app.use(express.json({ limit: '64kb' }));

  const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'test' ? 1000 : 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message:
        'Muitas tentativas a partir deste endereço. Aguarde alguns minutos antes de tentar novamente.',
    },
  });

  const resendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'test' ? 1000 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'RATE_LIMITED',
      message:
        'Limite de reenvios atingido temporariamente. Tente dentro de alguns minutos.',
    },
  });

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      service: 'connect-2026-api',
      status: 'ok',
    });
  });

  app.get('/api/openapi.json', (_req: Request, res: Response) => {
    res.status(200).json(openApiSpec);
  });

  const scalarHandler = apiReference({
    url: '/api/openapi.json',
    pageTitle: 'Connect 2026 API Reference (Scalar)',
    theme: 'bluePlanet',
  });

  app.get('/api/docs', scalarHandler);
  app.get('/api/reference', scalarHandler);

  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbOk = await repository.ping();
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      database: dbOk ? 'connected' : 'unreachable',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/status', async (_req: Request, res: Response) => {
    try {
      const registeredCount = await repository.count();
      const maxRegistrations = env.MAX_REGISTRATIONS;
      const remainingSpots = Math.max(0, maxRegistrations - registeredCount);

      res.status(200).json({
        maxRegistrations,
        registeredCount,
        remainingSpots,
        isFull: remainingSpots === 0,
        registrationOpen: true,
      });
    } catch {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Não foi possível verificar a disponibilidade de vagas.',
      });
    }
  });

  app.post(
    '/api/registrations',
    registrationLimiter,
    async (req: Request, res: Response) => {
      const parsed = registrationInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message:
            parsed.error.issues[0]?.message ??
            'Dados de inscrição inválidos.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      // Honeypot: se um bot preencheu o campo oculto "website", rejeita de forma limpa
      if (parsed.data.website.trim().length > 0) {
        res.status(400).json({
          error: 'BOT_DETECTED',
          message: 'Não foi possível validar o envio do formulário.',
        });
        return;
      }

      try {
        const ticket = await createSignedTicket(
          env.TICKET_SECRET,
          frontendBaseUrl,
        );
        const outcome = await repository.createWithCapacity({
          fullName: parsed.data.fullName,
          address: parsed.data.address,
          email: parsed.data.email,
          whatsapp: parsed.data.whatsapp,
          ticketCode: ticket.ticketCode,
          qrToken: ticket.qrToken,
          maxRegistrations: env.MAX_REGISTRATIONS,
        });

        if (!outcome.ok) {
          if (outcome.reason === 'CAPACITY_REACHED') {
            res.status(409).json({
              error: 'CAPACITY_REACHED',
              message:
                'As vagas para o Connect 2026 atingiram o limite máximo de inscrições.',
            });
            return;
          }

          if (outcome.reason === 'DUPLICATE_EMAIL') {
            res.status(409).json({
              error: 'DUPLICATE_EMAIL',
              message:
                'Este endereço de e-mail já possui uma inscrição registada.',
            });
            return;
          }

          res.status(409).json({
            error: 'DUPLICATE_WHATSAPP',
            message:
              'Este número de WhatsApp já possui uma inscrição registada.',
          });
          return;
        }

        const pdfBuffer = await generateInvitationPdfBuffer({
          fullName: outcome.registration.fullName,
          email: outcome.registration.email,
          whatsapp: outcome.registration.whatsapp,
          address: outcome.registration.address,
          ticketCode: outcome.registration.ticketCode,
          qrCodePngBuffer: ticket.qrCodePngBuffer,
        });

        const mailResult = await mailService.sendInvitation({
          fullName: outcome.registration.fullName,
          email: outcome.registration.email,
          whatsapp: outcome.registration.whatsapp,
          ticketCode: outcome.registration.ticketCode,
          qrUrl: ticket.qrUrl,
          pdfUrl: buildPdfDownloadUrl(
            outcome.registration.qrToken,
            ticket.qrUrl,
          ),
          qrCodePngBuffer: ticket.qrCodePngBuffer,
          pdfBuffer,
        });

        await repository.updateEmailStatus(
          outcome.registration.id,
          mailResult.status,
          mailResult.error ?? null,
        );

        res.status(201).json({
          message: 'Inscrição confirmada com sucesso.',
          registration: {
            id: outcome.registration.id,
            fullName: outcome.registration.fullName,
            address: outcome.registration.address,
            email: outcome.registration.email,
            whatsapp: outcome.registration.whatsapp,
            ticketCode: outcome.registration.ticketCode,
            qrToken: outcome.registration.qrToken,
            qrUrl: ticket.qrUrl,
            qrCodeDataUrl: ticket.qrCodeDataUrl,
            emailStatus: mailResult.status,
            createdAt: outcome.registration.createdAt.toISOString(),
          },
        });
      } catch {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message:
            'Ocorreu um erro inesperado ao registar a sua inscrição. Tente novamente.',
        });
      }
    },
  );

  app.post(
    '/api/registrations/:ticketCode/resend',
    resendLimiter,
    async (req: Request, res: Response) => {
      const ticketCode = String(req.params.ticketCode ?? '')
        .trim()
        .toUpperCase();

      if (!/^C26-[A-Z0-9]{6}$/.test(ticketCode)) {
        res.status(400).json({
          error: 'INVALID_TICKET_CODE',
          message: 'Código de convite inválido.',
        });
        return;
      }

      try {
        const record = await repository.findByTicketCode(ticketCode);
        if (!record) {
          res.status(404).json({
            error: 'NOT_FOUND',
            message: 'Inscrição não encontrada.',
          });
          return;
        }

        const qrUrl = buildTicketQrUrl(record.qrToken, frontendBaseUrl);
        const { qrCodePngBuffer } = await renderQrAssets(qrUrl);
        const pdfBuffer = await generateInvitationPdfBuffer({
          fullName: record.fullName,
          email: record.email,
          whatsapp: record.whatsapp,
          address: record.address,
          ticketCode: record.ticketCode,
          qrCodePngBuffer,
        });
        const mailResult = await mailService.sendInvitation({
          fullName: record.fullName,
          email: record.email,
          whatsapp: record.whatsapp,
          ticketCode: record.ticketCode,
          qrUrl,
          pdfUrl: buildPdfDownloadUrl(record.qrToken, qrUrl),
          qrCodePngBuffer,
          pdfBuffer,
        });

        await repository.updateEmailStatus(
          record.id,
          mailResult.status,
          mailResult.error ?? null,
        );

        res.status(mailResult.status === 'FAILED' ? 502 : 200).json({
          emailStatus: mailResult.status,
          message:
            mailResult.status === 'SENT'
              ? 'Convite reenviado para o seu e-mail.'
              : mailResult.status === 'SKIPPED'
                ? 'O serviço de e-mail ainda não está configurado neste ambiente.'
                : 'Não foi possível reenviar o e-mail neste momento.',
        });
      } catch {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'Erro ao tentar reenviar o convite.',
        });
      }
    },
  );

  app.get('/api/tickets/verify', async (req: Request, res: Response) => {
    const rawToken =
      typeof req.query.token === 'string' ? req.query.token.trim() : '';

    if (!rawToken) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Token do convite em falta.',
      });
      return;
    }

    const verification = verifyQrToken(rawToken, env.TICKET_SECRET);
    if (!verification.valid || !verification.ticketCode) {
      res.status(400).json({
        error: 'INVALID_QR_SIGNATURE',
        message: 'Convite inválido ou assinatura adulterada.',
      });
      return;
    }

    try {
      const record = await repository.findByTicketCode(verification.ticketCode);
      if (!record) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Inscrição não encontrada.',
        });
        return;
      }

      const qrUrl = buildTicketQrUrl(record.qrToken, frontendBaseUrl);
      const { qrCodeDataUrl } = await renderQrAssets(qrUrl);

      res.status(200).json({
        registration: {
          id: record.id,
          fullName: record.fullName,
          address: record.address,
          email: record.email,
          whatsapp: record.whatsapp,
          ticketCode: record.ticketCode,
          qrToken: record.qrToken,
          qrUrl,
          qrCodeDataUrl,
          emailStatus: record.emailStatus,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
          createdAt: record.createdAt.toISOString(),
        },
      });
    } catch {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Não foi possível consultar os dados do convite.',
      });
    }
  });

  app.get('/api/tickets/pdf', async (req: Request, res: Response) => {
    const rawToken =
      typeof req.query.token === 'string' ? req.query.token.trim() : '';

    if (!rawToken) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Token do convite em falta.',
      });
      return;
    }

    const verification = verifyQrToken(rawToken, env.TICKET_SECRET);
    if (!verification.valid || !verification.ticketCode) {
      res.status(400).json({
        error: 'INVALID_QR_SIGNATURE',
        message: 'Convite inválido ou assinatura adulterada.',
      });
      return;
    }

    try {
      const record = await repository.findByTicketCode(verification.ticketCode);
      if (!record) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Inscrição não encontrada.',
        });
        return;
      }

      const qrUrl = buildTicketQrUrl(record.qrToken, frontendBaseUrl);
      const { qrCodePngBuffer } = await renderQrAssets(qrUrl);
      const pdfBuffer = await generateInvitationPdfBuffer({
        fullName: record.fullName,
        email: record.email,
        whatsapp: record.whatsapp,
        address: record.address,
        ticketCode: record.ticketCode,
        qrCodePngBuffer,
      });

      const filename = `convite-connect-2026-${record.ticketCode.toLowerCase()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(pdfBuffer);
    } catch {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Não foi possível gerar o PDF do convite.',
      });
    }
  });

  app.post('/api/checkin', async (req: Request, res: Response) => {
    const providedKey = req.header('x-admin-api-key') ?? '';
    if (
      !env.ADMIN_API_KEY ||
      !constantTimeEquals(providedKey, env.ADMIN_API_KEY)
    ) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Chave de autorização inválida para check-in.',
      });
      return;
    }

    const parsed = checkinInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'QR Code inválido.',
      });
      return;
    }

    const verification = verifyQrToken(parsed.data.qrToken, env.TICKET_SECRET);
    if (!verification.valid || !verification.ticketCode) {
      res.status(400).json({
        error: 'INVALID_QR_SIGNATURE',
        message: 'Assinatura do QR Code inválida ou adulterada.',
      });
      return;
    }

    try {
      const outcome = await repository.markCheckedIn(verification.ticketCode);
      if (!outcome.ok) {
        if (outcome.reason === 'NOT_FOUND') {
          res.status(404).json({
            error: 'NOT_FOUND',
            message: 'Convite não encontrado na base de dados.',
          });
          return;
        }

        res.status(409).json({
          error: 'ALREADY_CHECKED_IN',
          message: 'Este convite já foi utilizado na entrada.',
          checkedInAt: outcome.checkedInAt.toISOString(),
          attendee: {
            fullName: outcome.registration.fullName,
            ticketCode: outcome.registration.ticketCode,
          },
        });
        return;
      }

      res.status(200).json({
        message: 'Check-in validado com sucesso.',
        attendee: {
          fullName: outcome.registration.fullName,
          email: outcome.registration.email,
          whatsapp: outcome.registration.whatsapp,
          ticketCode: outcome.registration.ticketCode,
          checkedInAt: outcome.registration.checkedInAt?.toISOString() ?? null,
        },
      });
    } catch {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Erro interno ao processar o check-in.',
      });
    }
  });

  return app;
}
