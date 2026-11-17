import { EVENT_INFO } from '@/data/event';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export interface EventCapacityStatus {
  maxRegistrations: number;
  registeredCount: number;
  remainingSpots: number;
  isFull: boolean;
  registrationOpen: boolean;
}

export interface RegistrationPayload {
  fullName: string;
  address?: string;
  email: string;
  whatsapp: string;
  website?: string;
}

export interface TicketRegistration {
  id: string;
  fullName: string;
  address: string | null;
  email: string;
  whatsapp: string;
  ticketCode: string;
  qrToken: string;
  qrCodeDataUrl: string;
  emailStatus: 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED';
  createdAt: string;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[] | undefined>;

  constructor(
    message: string,
    code: string,
    status: number,
    fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function fetchEventStatus(): Promise<EventCapacityStatus | null> {
  try {
    const res = await fetch(apiUrl('/api/status'));
    if (!res.ok) return null;
    return (await res.json()) as EventCapacityStatus;
  } catch {
    return null;
  }
}

export async function submitRegistration(
  payload: RegistrationPayload,
): Promise<TicketRegistration> {
  const res = await fetch(apiUrl('/api/registrations'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[] | undefined>;
    registration?: TicketRegistration;
  };

  if (!res.ok || !data.registration) {
    throw new ApiRequestError(
      data.message ?? 'Não foi possível concluir a sua inscrição.',
      data.error ?? 'REQUEST_FAILED',
      res.status,
      data.fieldErrors,
    );
  }

  return data.registration;
}

export async function resendInvitationEmail(ticketCode: string): Promise<{
  emailStatus: 'SENT' | 'SKIPPED' | 'FAILED';
  message: string;
}> {
  const res = await fetch(
    apiUrl(`/api/registrations/${encodeURIComponent(ticketCode)}/resend`),
    { method: 'POST' },
  );

  const data = (await res.json().catch(() => ({}))) as {
    emailStatus?: 'SENT' | 'SKIPPED' | 'FAILED';
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? 'Falha ao reenviar o convite por e-mail.');
  }

  return {
    emailStatus: data.emailStatus ?? 'SKIPPED',
    message: data.message ?? 'Pedido processado.',
  };
}

const COMMON_EMAIL_TYPOS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
};

export function suggestEmailCorrection(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex < 1) return null;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const corrected = COMMON_EMAIL_TYPOS[domain];
  return corrected ? `${local}@${corrected}` : null;
}

export function downloadCalendarInvite(ticketCode: string): void {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Connect 2026//Inscrição//PT',
    'BEGIN:VEVENT',
    `UID:${ticketCode}@connect2026`,
    `DTSTAMP:${EVENT_INFO.calendarStartUtc}`,
    `DTSTART:${EVENT_INFO.calendarStartUtc}`,
    `DTEND:${EVENT_INFO.calendarEndUtc}`,
    `SUMMARY:${EVENT_INFO.name} — ${EVENT_INFO.theme}`,
    `DESCRIPTION:Convite gratuito (${ticketCode}). Organização: ${EVENT_INFO.organization}. Contacto: ${EVENT_INFO.contactPhone}`,
    `LOCATION:${EVENT_INFO.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `connect-2026-${ticketCode.toLowerCase()}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
