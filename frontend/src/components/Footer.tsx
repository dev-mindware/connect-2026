import { ConnectLogo } from '@/components/ConnectLogo';
import { Separator } from '@/components/ui/separator';
import { EVENT_INFO } from '@/data/event';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 text-sm sm:flex-row sm:items-center">
          <div className="space-y-1">
            <ConnectLogo variant="compact" />
            <p className="text-xs text-muted-foreground">
              Organização: {EVENT_INFO.organization} — {EVENT_INFO.organizationFull}
            </p>
          </div>
          <div className="text-xs text-muted-foreground sm:text-right">
            <p>
              {EVENT_INFO.dateLabel} · {EVENT_INFO.timeLabel} · {EVENT_INFO.location}
            </p>
            <a
              href={EVENT_INFO.whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              WhatsApp: {EVENT_INFO.contactPhone}
            </a>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>{EVENT_INFO.admission}</p>
          <a
            href="/inscritos"
            className="underline-offset-4 hover:text-primary hover:underline"
          >
            Área da organização
          </a>
        </div>
      </div>
    </footer>
  );
}
