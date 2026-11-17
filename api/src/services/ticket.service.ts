import crypto from 'node:crypto';
import QRCode from 'qrcode';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface GeneratedTicket {
  ticketCode: string;
  qrToken: string;
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

export function verifyQrToken(
  qrToken: string,
  secret: string,
): { valid: boolean; ticketCode: string | null } {
  const parts = qrToken.trim().split('.');
  if (parts.length !== 2) {
    return { valid: false, ticketCode: null };
  }

  const [ticketCode, providedSig] = parts;
  if (!/^C26-[A-Z0-9]{6}$/.test(ticketCode)) {
    return { valid: false, ticketCode: null };
  }

  const expectedToken = signTicketCode(ticketCode, secret);
  const expectedSig = expectedToken.split('.')[1];

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, ticketCode: null };
  }

  return { valid: true, ticketCode };
}

export async function renderQrAssets(
  qrToken: string,
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
    QRCode.toDataURL(qrToken, options),
    QRCode.toBuffer(qrToken, { ...options, type: 'png' }),
  ]);

  return { qrCodeDataUrl, qrCodePngBuffer };
}

export async function createSignedTicket(
  secret: string,
): Promise<GeneratedTicket> {
  const ticketCode = generateTicketCode();
  const qrToken = signTicketCode(ticketCode, secret);
  const { qrCodeDataUrl, qrCodePngBuffer } = await renderQrAssets(qrToken);

  return {
    ticketCode,
    qrToken,
    qrCodeDataUrl,
    qrCodePngBuffer,
  };
}
