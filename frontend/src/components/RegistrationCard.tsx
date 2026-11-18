import { useEffect, useState, type FormEvent } from 'react';
import {
  CalendarPlus,
  Download,
  FileDown,
  Loader2,
  Mail,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { EVENT_INFO } from '@/data/event';
import {
  ApiRequestError,
  downloadCalendarInvite,
  getTicketPdfUrl,
  resendInvitationEmail,
  submitRegistration,
  suggestEmailCorrection,
  type EventCapacityStatus,
  type TicketRegistration,
} from '@/lib/api';

interface RegistrationCardProps {
  status: EventCapacityStatus | null;
  onRegistered: () => void;
}

interface FieldErrors {
  fullName?: string;
  address?: string;
  email?: string;
  whatsapp?: string;
}

export function RegistrationCard({
  status,
  onRegistered,
}: RegistrationCardProps) {
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [ticket, setTicket] = useState<TicketRegistration | null>(null);

  const emailSuggestion = suggestEmailCorrection(email);
  const isFull = status?.isFull ?? false;

  useEffect(() => {
    if (formError) setFormError(null);
  }, [fullName, address, email, whatsapp]);

  function validateClient(): boolean {
    const errors: FieldErrors = {};

    if (fullName.trim().length < 3) {
      errors.fullName = 'Indique o seu nome completo.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Indique um endereço de e-mail válido.';
    }

    const cleanedPhone = whatsapp.trim().replace(/[\s().-]+/g, '');
    if (!/^(\+?\d{8,15}|9\d{8})$/.test(cleanedPhone)) {
      errors.whatsapp =
        'Indique um número de WhatsApp válido (ex.: +244 934 242 419).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isFull) return;

    if (!validateClient()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await submitRegistration({
        fullName: fullName.trim(),
        address: address.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        website,
      });

      setTicket(created);
      onRegistered();

      if (created.emailStatus === 'SENT') {
        toast.success('Inscrição confirmada. Convite enviado por e-mail.');
      } else {
        toast.success('Inscrição confirmada.');
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFormError(err.message);
        if (err.fieldErrors) {
          setFieldErrors({
            fullName: err.fieldErrors.fullName?.[0],
            address: err.fieldErrors.address?.[0],
            email: err.fieldErrors.email?.[0],
            whatsapp: err.fieldErrors.whatsapp?.[0],
          });
        }
        if (err.code === 'CAPACITY_REACHED') {
          onRegistered();
        }
      } else {
        setFormError(
          'Não foi possível ligar ao servidor de inscrições. Tente novamente.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendEmail() {
    if (!ticket || isResending) return;
    setIsResending(true);
    try {
      const result = await resendInvitationEmail(ticket.ticketCode);
      setTicket((prev) =>
        prev ? { ...prev, emailStatus: result.emailStatus } : prev,
      );
      toast.info(result.message);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao reenviar o convite.',
      );
    } finally {
      setIsResending(false);
    }
  }

  function handleDownloadQr() {
    if (!ticket) return;
    const anchor = document.createElement('a');
    anchor.href = ticket.qrCodeDataUrl;
    anchor.download = `convite-connect-2026-${ticket.ticketCode.toLowerCase()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function handleReset() {
    setTicket(null);
    setFullName('');
    setAddress('');
    setEmail('');
    setWhatsapp('');
    setFieldErrors({});
    setFormError(null);
  }

  if (ticket) {
    return (
      <Card id="inscricao">
        <CardHeader>
          <CardTitle>{ticket.fullName}</CardTitle>
          <CardDescription>
            {EVENT_INFO.dateLabel} · {EVENT_INFO.timeLabel} · {EVENT_INFO.location}
          </CardDescription>
          <CardAction>
            <Badge variant="secondary" className="font-mono">
              {ticket.ticketCode}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col items-center py-2 text-center">
            <img
              src={ticket.qrCodeDataUrl}
              alt={`QR Code do convite ${ticket.ticketCode}`}
              className="size-44 rounded-md border p-2"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {ticket.emailStatus === 'SENT'
                ? `Convite enviado para ${ticket.email}.`
                : 'Apresente este QR Code à entrada do evento.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button asChild>
              <a
                href={getTicketPdfUrl(ticket.qrToken)}
                download={`convite-connect-2026-${ticket.ticketCode.toLowerCase()}.pdf`}
              >
                <FileDown />
                Transferir PDF
              </a>
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadQr}>
              <Download />
              QR Code
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadCalendarInvite(ticket.ticketCode)}
            >
              <CalendarPlus />
              Calendário
            </Button>
          </div>
        </CardContent>

        <Separator />

        <CardFooter className="justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isResending}
            onClick={handleResendEmail}
          >
            {isResending ? <Loader2 className="animate-spin" /> : <Mail />}
            Reenviar e-mail
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw />
            Nova inscrição
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card id="inscricao">
      <CardHeader>
        <CardTitle>Inscrição</CardTitle>
        <CardDescription>
          Receba o seu convite com QR Code por e-mail após o registo.
        </CardDescription>
        {status && (
          <CardAction>
            <Badge variant={status.isFull ? 'outline' : 'secondary'}>
              {status.isFull
                ? 'Lotação esgotada'
                : `${status.remainingSpots} vagas`}
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        {isFull ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Limite máximo de inscritos atingido.
            </p>
            <p>
              Para informações adicionais, contacte{' '}
              <a
                href={EVENT_INFO.whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {EVENT_INFO.contactPhone}
              </a>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fullName">Nome completo *</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="Ana Paula Manuel"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) {
                    setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.fullName)}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Morada</Label>
              <Input
                id="address"
                name="address"
                type="text"
                autoComplete="street-address"
                placeholder="Viana, Luanda"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                aria-invalid={Boolean(fieldErrors.address)}
              />
              {fieldErrors.address && (
                <p className="text-xs text-destructive">{fieldErrors.address}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {emailSuggestion && (
                <button
                  type="button"
                  onClick={() => setEmail(emailSuggestion)}
                  className="w-fit text-left text-xs text-primary underline-offset-4 hover:underline"
                >
                  Quis dizer {emailSuggestion}?
                </button>
              )}
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+244 934 242 419"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  if (fieldErrors.whatsapp) {
                    setFieldErrors((prev) => ({ ...prev, whatsapp: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.whatsapp)}
              />
              {fieldErrors.whatsapp && (
                <p className="text-xs text-destructive">{fieldErrors.whatsapp}</p>
              )}
            </div>

            {formError && (
              <p role="alert" className="text-xs text-destructive">
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  A confirmar...
                </>
              ) : (
                'Confirmar inscrição'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
