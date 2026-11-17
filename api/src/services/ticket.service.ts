import crypto from 'node:crypto';
import QRCode from 'qrcode';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface GeneratedTicket {
  ticketCode: string;
  qrToken: string;
  qrUrl: string;
  qrCodeDataUrl: string;
  qrCodePngBuffer: Buffer;
}

export function generateTicketCode(): string {
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `C26-${suffix}`;
}

export function signTicketCode(ticketCode: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(ticketCode)
    .digest('hex')
    .slice(0, 24);
  return `${ticketCode}.${signature}`;
}

export function resolveFrontendBaseUrl(
  publicFrontendUrl?: string,
  corsOrigins?: string,
): string {
  const trimmedPublic = (publicFrontendUrl ?? '').trim().replace(/\/+$/, '');
  if (trimmedPublic) {
    return trimmedPublic;
  }

  const firstOrigin = (corsOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .find((origin) => /^https?:\/\//i.test(origin));

  return firstOrigin ?? 'http://localhost:5173';
}

export function buildTicketQrUrl(qrToken: string, frontendBaseUrl: string): string {
  const base = frontendBaseUrl.replace(/\/+$/, '');
  return `${base}/convite?token=${encodeURIComponent(qrToken)}`;
}

export function extractQrToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const tokenParam = parsed.searchParams.get('token');
      if (tokenParam) {
        return tokenParam.trim();
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function verifyQrToken(
  rawInput: string,
  secret: string,
): { valid: boolean; ticketCode: string | null; qrToken: string } {
  const qrToken = extractQrToken(rawInput);
  const parts = qrToken.split('.');
  if (parts.length !== 2) {
    return { valid: false, ticketCode: null, qrToken };
  }

  const [ticketCode, providedSig] = parts;
  if (!/^C26-[A-Z0-9]{6}$/.test(ticketCode)) {
    return { valid: false, ticketCode: null, qrToken };
  }

  const expectedToken = signTicketCode(ticketCode, secret);
  const expectedSig = expectedToken.split('.')[1];

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, ticketCode: null, qrToken };
  }

  return { valid: true, ticketCode, qrToken };
}

export async function renderQrAssets(
  qrPayload: string,
): Promise<{ qrCodeDataUrl: string; qrCodePngBuffer: Buffer }> {
  const options: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#07143B',
      light: '#FFFFFF',
    },
  };

  const [qrCodeDataUrl, qrCodePngBuffer] = await Promise.all([
    QRCode.toDataURL(qrPayload, options),
    QRCode.toBuffer(qrPayload, { ...options, type: 'png' }),
  ]);

  return { qrCodeDataUrl, qrCodePngBuffer };
}

export async function createSignedTicket(
  secret: string,
  frontendBaseUrl: string,
): Promise<GeneratedTicket> {
  const ticketCode = generateTicketCode();
  const qrToken = signTicketCode(ticketCode, secret);
  const qrUrl = buildTicketQrUrl(qrToken, frontendBaseUrl);
  const { qrCodeDataUrl, qrCodePngBuffer } = await renderQrAssets(qrUrl);

  return {
    ticketCode,
    qrToken,
    qrUrl,
    qrCodeDataUrl,
    qrCodePngBuffer,
  };
}
