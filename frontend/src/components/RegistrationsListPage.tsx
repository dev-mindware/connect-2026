import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ApiRequestError,
  checkInTicket,
  exportRegistrationsCsv,
  fetchRegistrationsList,
  type RegistrantListItem,
  type RegistrationsListResponse,
} from '@/lib/api';

const STORAGE_KEY = 'connect2026_admin_list_code';

type CheckinFilter = 'all' | 'checked_in' | 'pending';

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-AO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatEmailStatus(status: RegistrantListItem['emailStatus']): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (status) {
    case 'SENT':
      return { label: 'Enviado', variant: 'secondary' };
    case 'FAILED':
      return { label: 'Falhou', variant: 'destructive' };
    case 'SKIPPED':
      return { label: 'Ignorado', variant: 'outline' };
    default:
      return { label: 'Pendente', variant: 'outline' };
  }
}

export function RegistrationsListPage() {
  const [savedCode, setSavedCode] = useState<string>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [codeInput, setCodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(savedCode));
  const [data, setData] = useState<RegistrationsListResponse | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CheckinFilter>('all');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const loadList = useCallback(async (code: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await fetchRegistrationsList(code);
      setData(response);
      setSavedCode(code);
      try {
        sessionStorage.setItem(STORAGE_KEY, code);
      } catch {
        // Ignora erro de storage em modo privado
      }
    } catch (err) {
      setData(null);
      setSavedCode('');
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignora erro de storage
      }
      if (err instanceof ApiRequestError && err.status === 401) {
        setAuthError('Código de acesso inválido.');
      } else {
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Não foi possível validar o código de acesso.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedCode) {
      void loadList(savedCode);
    }
  }, []);

  function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = codeInput.trim();
    if (!trimmed) {
      setAuthError('Introduza o código de acesso.');
      return;
    }
    void loadList(trimmed);
  }

  function handleLogout() {
    setSavedCode('');
    setCodeInput('');
    setData(null);
    setAuthError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignora erro de storage
    }
  }

  async function handleQuickCheckin(item: RegistrantListItem) {
    if (!savedCode || checkingInId) return;
    setCheckingInId(item.id);
    try {
      const res = await checkInTicket(item.qrToken, savedCode);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checkedInCount: prev.checkedInCount + 1,
          registrations: prev.registrations.map((r) =>
            r.id === item.id
              ? { ...r, checkedInAt: res.attendee.checkedInAt }
              : r,
          ),
        };
      });
      toast.success(`Check-in confirmado para ${item.fullName}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao confirmar check-in.',
      );
    } finally {
      setCheckingInId(null);
    }
  }

  const filteredRegistrations = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();

    return data.registrations.filter((item) => {
      if (filter === 'checked_in' && !item.checkedInAt) return false;
      if (filter === 'pending' && item.checkedInAt) return false;
      if (!term) return true;

      return (
        item.fullName.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.whatsapp.toLowerCase().includes(term) ||
        item.ticketCode.toLowerCase().includes(term) ||
        (item.address ?? '').toLowerCase().includes(term)
      );
    });
  }, [data, search, filter]);

  if (!data) {
    return (
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="mb-6">
            <Button asChild variant="ghost" size="sm">
              <a href="/">
                <ArrowLeft />
                Voltar à página do evento
              </a>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                Listagem de inscritos
              </CardTitle>
              <CardDescription>
                Introduza o código de acesso definido no servidor para consultar
                os participantes registados.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  A verificar acesso...
                </div>
              ) : (
                <form onSubmit={handleUnlock} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="accessCode">Código de acesso</Label>
                    <Input
                      id="accessCode"
                      type="password"
                      autoComplete="off"
                      placeholder="Introduza o código de acesso"
                      value={codeInput}
                      onChange={(e) => {
                        setCodeInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      aria-invalid={Boolean(authError)}
                    />
                  </div>

                  {authError && (
                    <p role="alert" className="text-xs text-destructive">
                      {authError}
                    </p>
                  )}

                  <Button type="submit" className="w-full">
                    Aceder à listagem
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Inscritos
            </h1>
            <p className="text-sm text-muted-foreground">
              Listagem completa de participantes registados no Connect 2026.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadList(savedCode)}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              Actualizar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={filteredRegistrations.length === 0}
              onClick={() => exportRegistrationsCsv(filteredRegistrations)}
            >
              <Download />
              Exportar CSV
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut />
              Bloquear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="py-4">
            <CardHeader className="px-4">
              <CardDescription>Total inscritos</CardDescription>
              <CardTitle className="text-2xl">{data.registeredCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4">
              <CardDescription>Vagas disponíveis</CardDescription>
              <CardTitle className="text-2xl">{data.remainingSpots}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4">
              <CardDescription>Lotação máxima</CardDescription>
              <CardTitle className="text-2xl">{data.maxRegistrations}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="py-4">
            <CardHeader className="px-4">
              <CardDescription>Check-ins feitos</CardDescription>
              <CardTitle className="text-2xl">{data.checkedInCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Procurar por nome, e-mail, WhatsApp ou código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                >
                  Todos ({data.registeredCount})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filter === 'checked_in' ? 'default' : 'outline'}
                  onClick={() => setFilter('checked_in')}
                >
                  Check-in feito ({data.checkedInCount})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setFilter('pending')}
                >
                  Pendentes ({data.registeredCount - data.checkedInCount})
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {filteredRegistrations.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum inscrito encontrado com os critérios actuais.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome completo</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Morada</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((item) => {
                    const emailBadge = formatEmailStatus(item.emailStatus);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          <a
                            href={`/convite?token=${encodeURIComponent(item.qrToken)}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {item.ticketCode}
                          </a>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.fullName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.email}
                        </TableCell>
                        <TableCell>{item.whatsapp}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.address ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={emailBadge.variant}>
                            {emailBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.checkedInAt ? (
                            <Badge variant="default">
                              <CheckCircle2 />
                              {formatDateTime(item.checkedInAt)}
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={checkingInId === item.id}
                              onClick={() => void handleQuickCheckin(item)}
                            >
                              {checkingInId === item.id ? (
                                <Loader2 className="animate-spin" />
                              ) : null}
                              Validar entrada
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(item.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>

          <CardFooter className="text-xs text-muted-foreground">
            A mostrar {filteredRegistrations.length} de {data.registeredCount}{' '}
            inscritos.
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
