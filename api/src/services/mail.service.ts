import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { AppEnv } from '../config/env';

export interface InvitationMailPayload {
  fullName: string;
  email: string;
  whatsapp: string;
  ticketCode: string;
  qrCodePngBuffer: Buffer;
}

export interface MailDispatchResult {
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  provider: 'resend' | 'smtp' | 'none';
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildInvitationEmailHtml(
  payload: Omit<InvitationMailPayload, 'qrCodePngBuffer'>,
): string {
  const safeName = escapeHtml(payload.fullName);
  const safeCode = escapeHtml(payload.ticketCode);
  const safeWhatsapp = escapeHtml(payload.whatsapp);

  return `<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Convite Connect 2026</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4F7FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#07143B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #DCE5FB;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#0038D6;padding:28px 32px;color:#FFFFFF;">
                <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#FFD400;">
                  Entrada Gratuita · Convite Oficial
                </p>
                <h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:800;color:#FFFFFF;">
                  Connect 2026
                </h1>
                <p style="margin:8px 0 0 0;font-size:15px;line-height:1.5;color:#E6EEFF;">
                  O Peso dos Sonhos, O Ritmo da Rotina
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#07143B;">
                  Olá, <strong>${safeName}</strong>. A sua inscrição foi confirmada. Apresente o QR Code abaixo à entrada do evento.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFF;border:1px solid #DCE5FB;border-radius:12px;margin:20px 0;">
                  <tr>
                    <td align="center" style="padding:24px 16px;">
                      <img src="cid:connect2026-qr" alt="QR Code do convite ${safeCode}" width="210" height="210" style="display:block;border-radius:8px;background:#FFFFFF;padding:8px;border:1px solid #DCE5FB;" />
                      <p style="margin:14px 0 0 0;font-size:13px;font-weight:700;letter-spacing:0.12em;color:#0038D6;">
                        CÓDIGO: ${safeCode}
                      </p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E8EEF9;padding-top:16px;font-size:14px;line-height:1.7;color:#324168;">
                  <tr>
                    <td style="padding:4px 0;"><strong>Data e hora:</strong> 06 de Dezembro · 13h00</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;"><strong>Local:</strong> Shopping Viana</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;"><strong>WhatsApp registado:</strong> ${safeWhatsapp}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;"><strong>Organização:</strong> A.M.T.T.S · Contacto: +244 934 242 419</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#07143B;padding:18px 32px;font-size:12px;color:#C7D4F5;text-align:center;">
                Connect 2026 · Guarde este e-mail para acesso rápido no dia do evento.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface MailService {
  sendInvitation: (payload: InvitationMailPayload) => Promise<MailDispatchResult>;
}

export function createMailService(env: AppEnv): MailService {
  const resend =
    env.RESEND_API_KEY && env.RESEND_FROM_EMAIL
      ? new Resend(env.RESEND_API_KEY)
      : null;

  const smtpConfigured = Boolean(env.SMTP_HOST && (env.SMTP_FROM || env.SMTP_USER));
  const transporter = smtpConfigured
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      })
    : null;

  return {
    async sendInvitation(payload: InvitationMailPayload): Promise<MailDispatchResult> {
      const html = buildInvitationEmailHtml(payload);
      const subject = `O seu convite Connect 2026 (${payload.ticketCode})`;
      const text = [
        `Olá ${payload.fullName},`,
        '',
        'A sua inscrição no Connect 2026 — O Peso dos Sonhos, O Ritmo da Rotina está confirmada.',
        `Código do convite: ${payload.ticketCode}`,
        'Data: 06 de Dezembro · 13h00',
        'Local: Shopping Viana',
        'Contacto: +244 934 242 419',
      ].join('\n');

      if (resend) {
        try {
          const response = await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to: [payload.email],
            subject,
            html,
            text,
            attachments: [
              {
                filename: `${payload.ticketCode}.png`,
                content: payload.qrCodePngBuffer,
                contentId: 'connect2026-qr',
              },
            ],
          });

          if (response.error) {
            return {
              status: 'FAILED',
              provider: 'resend',
              error: response.error.message,
            };
          }

          return { status: 'SENT', provider: 'resend' };
        } catch (err) {
          return {
            status: 'FAILED',
            provider: 'resend',
            error: err instanceof Error ? err.message : 'Erro desconhecido no Resend.',
          };
        }
      }

      if (transporter) {
        try {
          await transporter.sendMail({
            from: env.SMTP_FROM || env.SMTP_USER,
            to: payload.email,
            subject,
            text,
            html,
            attachments: [
              {
                filename: `${payload.ticketCode}.png`,
                content: payload.qrCodePngBuffer,
                cid: 'connect2026-qr',
              },
            ],
          });
          return { status: 'SENT', provider: 'smtp' };
        } catch (err) {
          return {
            status: 'FAILED',
            provider: 'smtp',
            error: err instanceof Error ? err.message : 'Erro desconhecido no SMTP.',
          };
        }
      }

      return { status: 'SKIPPED', provider: 'none' };
    },
  };
}
