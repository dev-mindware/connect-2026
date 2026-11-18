import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { AppEnv } from '../config/env';

export interface InvitationMailPayload {
  fullName: string;
  email: string;
  whatsapp: string;
  ticketCode: string;
  qrUrl?: string;
  pdfUrl?: string;
  qrCodePngBuffer: Buffer;
  pdfBuffer?: Buffer;
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
  const safeQrUrl = payload.qrUrl ? escapeHtml(payload.qrUrl) : '';
  const safePdfUrl = payload.pdfUrl ? escapeHtml(payload.pdfUrl) : '';

  const buttons: string[] = [];
  if (safeQrUrl) {
    buttons.push(
      `<a href="${safeQrUrl}" target="_blank" rel="noreferrer" style="display:inline-block;background-color:#0038D6;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:11px 18px;border-radius:8px;margin:4px;">Abrir convite digital</a>`,
    );
  }
  if (safePdfUrl) {
    buttons.push(
      `<a href="${safePdfUrl}" target="_blank" rel="noreferrer" style="display:inline-block;background-color:#FFFFFF;color:#07143B;border:1px solid #DCE5FB;font-size:14px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:8px;margin:4px;">Transferir PDF</a>`,
    );
  }

  const actionBlock =
    buttons.length > 0
      ? `<tr>
        <td align="center" style="padding:20px 0 4px 0;">
          ${buttons.join('')}
        </td>
      </tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Convite Connect 2026 (${safeCode})</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F6F8FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#07143B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#FFFFFF;border:1px solid #E2E8F4;border-top:3px solid #0038D6;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #E2E8F4;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:6px;background-color:#0038D6;color:#FFD400;font-size:14px;font-weight:800;vertical-align:middle;margin-right:8px;">C</span>
                      <span style="font-size:17px;font-weight:700;color:#07143B;vertical-align:middle;letter-spacing:-0.02em;">Connect <span style="color:#0038D6;">2026</span></span>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;background-color:#F1F5FF;border:1px solid #DCE5FB;border-radius:6px;padding:4px 10px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:12px;font-weight:600;color:#07143B;">
                        ${safeCode}
                      </span>
                    </td>
                  </tr>
                </table>
                <p style="margin:10px 0 0 0;font-size:13px;line-height:1.5;color:#4B5A7D;">
                  O Peso dos Sonhos, O Ritmo da Rotina
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 24px 32px;">
                <p style="margin:0 0 8px 0;font-size:16px;font-weight:600;line-height:1.4;color:#07143B;">
                  Olá, ${safeName}.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#4B5A7D;">
                  A sua inscrição está confirmada. Apresente este código QR à entrada do evento no Shopping Viana.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0 0;">
                  <tr>
                    <td align="center">
                      <img src="cid:connect2026-qr" alt="QR Code do convite ${safeCode}" width="184" height="184" style="display:block;border-radius:8px;background:#FFFFFF;padding:10px;border:1px solid #E2E8F4;" />
                      <p style="margin:10px 0 0 0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#4B5A7D;">
                        ${safeCode}
                      </p>
                    </td>
                  </tr>
                  ${actionBlock}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 24px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E2E8F4;font-size:13px;line-height:1.5;">
                  <tr>
                    <td style="padding:12px 0 8px 0;color:#4B5A7D;width:110px;">Data e hora</td>
                    <td style="padding:12px 0 8px 0;color:#07143B;font-weight:600;" align="right">06 de Dezembro, 13h00</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-top:1px solid #F1F5FF;color:#4B5A7D;">Local</td>
                    <td style="padding:8px 0;border-top:1px solid #F1F5FF;color:#07143B;font-weight:600;" align="right">Shopping Viana</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-top:1px solid #F1F5FF;color:#4B5A7D;">Entrada</td>
                    <td style="padding:8px 0;border-top:1px solid #F1F5FF;color:#07143B;font-weight:600;" align="right">Gratuita · Por inscrição</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-top:1px solid #F1F5FF;color:#4B5A7D;">WhatsApp</td>
                    <td style="padding:8px 0;border-top:1px solid #F1F5FF;color:#07143B;font-weight:600;" align="right">${safeWhatsapp}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0 0 0;border-top:1px solid #F1F5FF;color:#4B5A7D;">Organização</td>
                    <td style="padding:8px 0 0 0;border-top:1px solid #F1F5FF;color:#07143B;font-weight:600;" align="right">A.M.T.T.S · +244 934 242 419</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px;background-color:#FAFBFD;border-top:1px solid #E2E8F4;font-size:12px;line-height:1.5;color:#64748B;text-align:center;">
                Connect 2026 · Guarde este e-mail para acesso rápido à entrada.
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
        ...(payload.qrUrl ? [`Convite digital: ${payload.qrUrl}`] : []),
        ...(payload.pdfUrl ? [`Transferir PDF: ${payload.pdfUrl}`] : []),
        'Data: 06 de Dezembro · 13h00',
        'Local: Shopping Viana',
        'Contacto: +244 934 242 419',
      ].join('\n');

      const pdfFileName = `convite-connect-2026-${payload.ticketCode.toLowerCase()}.pdf`;

      if (resend) {
        try {
          const attachments: Array<{
            filename: string;
            content: Buffer;
            contentId?: string;
            contentType?: string;
          }> = [
            {
              filename: `${payload.ticketCode}.png`,
              content: payload.qrCodePngBuffer,
              contentId: 'connect2026-qr',
            },
          ];

          if (payload.pdfBuffer) {
            attachments.push({
              filename: pdfFileName,
              content: payload.pdfBuffer,
              contentType: 'application/pdf',
            });
          }

          const response = await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to: [payload.email],
            subject,
            html,
            text,
            attachments,
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
          const attachments: Array<{
            filename: string;
            content: Buffer;
            cid?: string;
            contentType?: string;
          }> = [
            {
              filename: `${payload.ticketCode}.png`,
              content: payload.qrCodePngBuffer,
              cid: 'connect2026-qr',
            },
          ];

          if (payload.pdfBuffer) {
            attachments.push({
              filename: pdfFileName,
              content: payload.pdfBuffer,
              contentType: 'application/pdf',
            });
          }

          await transporter.sendMail({
            from: env.SMTP_FROM || env.SMTP_USER,
            to: payload.email,
            subject,
            text,
            html,
            attachments,
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
