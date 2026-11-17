import { EVENT_INFO } from '@/data/event';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 text-sm sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-foreground">{EVENT_INFO.name}</p>
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

        <p className="text-xs text-muted-foreground">{EVENT_INFO.admission}</p>
      </div>
    </footer>
  );
}
