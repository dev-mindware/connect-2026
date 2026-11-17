import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Download,
  Loader2,
  ShieldCheck,
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
  checkInTicket,
  downloadCalendarInvite,
  verifyTicketByToken,
  type TicketRegistration,
} from '@/lib/api';

interface TicketPassViewProps {
  token: string;
}

const ADMIN_KEY_STORAGE = 'connect2026_admin_checkin_key';

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-AO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TicketPassView({ token }: TicketPassViewProps) {
  const [ticket, setTicket] = useState<TicketRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCheckin, setShowCheckin] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? '';
    } catch {
      return '';
    }
  });
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        setError('Nenhum token de convite foi encontrado no link.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const registration = await verifyTicketByToken(token);
        if (active) {
          setTicket(registration);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível validar este convite.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  function handleDownloadQr() {
    if (!ticket) return;
    const anchor = document.createElement('a');
    anchor.href = ticket.qrCodeDataUrl;
    anchor.download = `convite-connect-2026-${ticket.ticketCode.toLowerCase()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function handleCheckin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || checkingIn) return;

    const trimmedKey = adminKey.trim();
    if (!trimmedKey) {
      toast.error('Indique a chave administrativa de check-in.');
      return;
    }

    setCheckingIn(true);
    try {
      const result = await checkInTicket(ticket.qrToken, trimmedKey);
      try {
        sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmedKey);
      } catch {
        // Ignora erro de storage em modo privado
      }
      setTicket((prev) =>
        prev
          ? { ...prev, checkedInAt: result.attendee.checkedInAt }
          : prev,
      );
      toast.success(result.message);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        toast.error(err.message);
      } else {
        toast.error('Erro ao validar check-in.');
      }
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <a href="/">
              <ArrowLeft />
              Voltar à página do evento
            </a>
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              A carregar dados do convite...
            </CardContent>
          </Card>
        ) : error || !ticket ? (
          <Card>
            <CardHeader>
              <CardTitle>Convite inválido</CardTitle>
              <CardDescription>
                {error ?? 'Não foi possível localizar esta inscrição.'}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <a href="/">Fazer nova inscrição</a>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={ticket.checkedInAt ? 'default' : 'secondary'}>
                  {ticket.checkedInAt
                    ? 'Check-in realizado'
                    : 'Convite válido'}
                </Badge>
                <Badge variant="outline" className="font-mono">
                  {ticket.ticketCode}
                </Badge>
              </div>
              <CardTitle className="pt-2 text-2xl">{ticket.fullName}</CardTitle>
              <CardDescription>
                {EVENT_INFO.name} · {EVENT_INFO.dateLabel}, {EVENT_INFO.timeLabel} ·{' '}
                {EVENT_INFO.location}
              </CardDescription>
              <CardAction>
                {ticket.checkedInAt ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : null}
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-6">
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">E-mail</dt>
                  <dd className="mt-1 font-medium break-all text-foreground">
                    {ticket.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">WhatsApp</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {ticket.whatsapp}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Morada</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {ticket.address ?? 'Não informada'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Data de inscrição</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {formatDateTime(ticket.createdAt)}
                  </dd>
                </div>
                {ticket.checkedInAt ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Entrada confirmada em</dt>
                    <dd className="mt-1 font-medium text-primary">
                      {formatDateTime(ticket.checkedInAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <Separator />

              <div className="flex flex-col items-center text-center">
                <img
                  src={ticket.qrCodeDataUrl}
                  alt={`QR Code do convite ${ticket.ticketCode}`}
                  className="size-40 rounded-md border p-2"
                />
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {ticket.ticketCode}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" onClick={handleDownloadQr}>
                  <Download />
                  Descarregar QR Code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadCalendarInvite(ticket.ticketCode)}
                >
                  <CalendarPlus />
                  Adicionar ao Calendário
                </Button>
              </div>

              {!ticket.checkedInAt ? (
                <>
                  <Separator />
                  {!showCheckin ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCheckin(true)}
                    >
                      <ShieldCheck />
                      Validar entrada (Equipa do evento)
                    </Button>
                  ) : (
                    <form onSubmit={handleCheckin} className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="adminKey">
                          Chave de check-in (ADMIN_API_KEY)
                        </Label>
                        <Input
                          id="adminKey"
                          type="password"
                          placeholder="Introduza a chave da organização"
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                        />
                      </div>
                      <Button type="submit" disabled={checkingIn}>
                        {checkingIn ? (
                          <>
                            <Loader2 className="animate-spin" />
                            A validar entrada...
                          </>
                        ) : (
                          'Confirmar entrada (Check-in)'
                        )}
                      </Button>
                    </form>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
