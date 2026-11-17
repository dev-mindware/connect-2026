import { z } from 'zod';

/**
 * Normaliza números de WhatsApp para formato E.164.
 * Números locais angolanos de 9 dígitos (ex.: 934242419) recebem automaticamente o indicativo +244.
 */
export function normalizeWhatsApp(raw: string): string {
  const cleaned = raw.trim().replace(/[\s().-]+/g, '');
  if (/^9\d{8}$/.test(cleaned)) {
    return `+244${cleaned}`;
  }
  if (/^2449\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^00\d{7,15}$/.test(cleaned)) {
    return `+${cleaned.slice(2)}`;
  }
  if (/^\+\d{8,15}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}

export const registrationInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Indique o seu nome completo.')
    .max(120, 'O nome não pode exceder 120 caracteres.'),
  address: z
    .string()
    .trim()
    .max(200, 'A morada não pode exceder 200 caracteres.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Indique um endereço de e-mail válido.')
    .max(160, 'O e-mail não pode exceder 160 caracteres.'),
  whatsapp: z
    .string()
    .trim()
    .transform(normalizeWhatsApp)
    .refine(
      (value) => /^\+\d{8,15}$/.test(value),
      'Indique um número de WhatsApp válido (ex.: +244 934 242 419).',
    ),
  // Campo honeypot invisível para bloquear bots simples
  website: z.string().optional().default(''),
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export const checkinInputSchema = z.object({
  qrToken: z.string().trim().min(6, 'Token do QR Code inválido.'),
});
