import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface InvitationPdfPayload {
  fullName: string;
  email: string;
  whatsapp: string;
  address?: string | null;
  ticketCode: string;
  qrCodePngBuffer: Buffer;
}

/**
 * Garante compatibilidade com WinAnsi (StandardFonts.Helvetica),
 * removendo caracteres fora do intervalo Latin-1/Windows-1252.
 */
function toWinAnsiSafe(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

export async function generateInvitationPdfBuffer(
  payload: InvitationPdfPayload,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Convite Connect 2026 - ${payload.ticketCode}`);
  pdfDoc.setAuthor('Connect 2026 / A.M.T.T.S');

  // Formato A5 vertical (419.53 x 595.28 pt) — ideal para impressão e telemóvel
  const pageWidth = 419.53;
  const pageHeight = 595.28;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const cobalt = rgb(0, 0.22, 0.84); // #0038D6
  const navy = rgb(0.027, 0.078, 0.231); // #07143B
  const slate = rgb(0.294, 0.353, 0.49); // #4B5A7D
  const border = rgb(0.886, 0.91, 0.957); // #E2E8F4
  const softBg = rgb(0.969, 0.976, 0.996); // #F7F9FE
  const yellow = rgb(1, 0.831, 0); // #FFD400
  const white = rgb(1, 1, 1);

  const margin = 28;
  const cardWidth = pageWidth - margin * 2;
  const cardBottom = 28;
  const cardTop = pageHeight - 28;
  const cardHeight = cardTop - cardBottom;

  // Fundo da página e cartão branco principal
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(0.965, 0.973, 0.988),
  });

  page.drawRectangle({
    x: margin,
    y: cardBottom,
    width: cardWidth,
    height: cardHeight,
    color: white,
    borderColor: border,
    borderWidth: 1,
  });

  // Barra superior azul cobalto
  page.drawRectangle({
    x: margin,
    y: cardTop - 4,
    width: cardWidth,
    height: 4,
    color: cobalt,
  });

  // Monograma C + Wordmark Connect 2026
  const headerY = cardTop - 42;
  page.drawRectangle({
    x: margin + 22,
    y: headerY - 4,
    width: 24,
    height: 24,
    color: cobalt,
  });
  page.drawText('C', {
    x: margin + 29,
    y: headerY + 3,
    size: 14,
    font: fontBold,
    color: yellow,
  });

  page.drawText('Connect', {
    x: margin + 54,
    y: headerY + 3,
    size: 15,
    font: fontBold,
    color: navy,
  });
  page.drawText('2026', {
    x: margin + 118,
    y: headerY + 3,
    size: 15,
    font: fontBold,
    color: cobalt,
  });

  // Badge do código do convite à direita
  const safeCode = toWinAnsiSafe(payload.ticketCode);
  const badgeWidth = 92;
  const badgeX = margin + cardWidth - 22 - badgeWidth;
  page.drawRectangle({
    x: badgeX,
    y: headerY - 2,
    width: badgeWidth,
    height: 20,
    color: softBg,
    borderColor: border,
    borderWidth: 1,
  });
  page.drawText(safeCode, {
    x: badgeX + 10,
    y: headerY + 4,
    size: 10,
    font: fontMono,
    color: navy,
  });

  page.drawText('O Peso dos Sonhos, O Ritmo da Rotina', {
    x: margin + 22,
    y: headerY - 20,
    size: 10,
    font: fontRegular,
    color: slate,
  });

  // Linha divisória do cabeçalho
  page.drawLine({
    start: { x: margin + 22, y: headerY - 32 },
    end: { x: margin + cardWidth - 22, y: headerY - 32 },
    thickness: 1,
    color: border,
  });

  // Secção do participante
  const participantY = headerY - 56;
  page.drawText('CONVITE DE ENTRADA GRATUITA', {
    x: margin + 22,
    y: participantY,
    size: 8.5,
    font: fontBold,
    color: cobalt,
  });

  const safeName = truncateText(toWinAnsiSafe(payload.fullName), 38);
  page.drawText(safeName, {
    x: margin + 22,
    y: participantY - 20,
    size: 16,
    font: fontBold,
    color: navy,
  });

  // QR Code centrado
  const qrImage = await pdfDoc.embedPng(payload.qrCodePngBuffer);
  const qrSize = 156;
  const qrBoxSize = 172;
  const qrBoxX = (pageWidth - qrBoxSize) / 2;
  const qrBoxY = participantY - 210;

  page.drawRectangle({
    x: qrBoxX,
    y: qrBoxY,
    width: qrBoxSize,
    height: qrBoxSize,
    color: white,
    borderColor: border,
    borderWidth: 1,
  });

  page.drawImage(qrImage, {
    x: qrBoxX + (qrBoxSize - qrSize) / 2,
    y: qrBoxY + (qrBoxSize - qrSize) / 2,
    width: qrSize,
    height: qrSize,
  });

  page.drawText('Apresente este QR Code à entrada do Shopping Viana.', {
    x: margin + 62,
    y: qrBoxY - 18,
    size: 9.5,
    font: fontRegular,
    color: slate,
  });

  // Tabela de detalhes
  const rows: Array<[string, string]> = [
    ['Data e hora', '06 de Dezembro de 2026, 13h00'],
    ['Local', 'Shopping Viana'],
    ['E-mail', truncateText(toWinAnsiSafe(payload.email), 36)],
    ['WhatsApp', truncateText(toWinAnsiSafe(payload.whatsapp), 28)],
  ];

  if (payload.address) {
    rows.push(['Morada', truncateText(toWinAnsiSafe(payload.address), 36)]);
  }
  rows.push(['Organização', 'A.M.T.T.S · +244 934 242 419']);

  let currentY = qrBoxY - 40;
  for (const [label, value] of rows) {
    page.drawLine({
      start: { x: margin + 22, y: currentY + 12 },
      end: { x: margin + cardWidth - 22, y: currentY + 12 },
      thickness: 0.75,
      color: border,
    });

    page.drawText(label, {
      x: margin + 22,
      y: currentY - 2,
      size: 9.5,
      font: fontRegular,
      color: slate,
    });

    const valWidth = fontBold.widthOfTextAtSize(value, 9.5);
    page.drawText(value, {
      x: margin + cardWidth - 22 - valWidth,
      y: currentY - 2,
      size: 9.5,
      font: fontBold,
      color: navy,
    });

    currentY -= 22;
  }

  // Rodapé
  page.drawText(`Código ${safeCode} · Entrada gratuita por inscrição`, {
    x: margin + 22,
    y: cardBottom + 16,
    size: 8.5,
    font: fontRegular,
    color: slate,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
