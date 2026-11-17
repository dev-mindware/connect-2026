import { Badge } from '@/components/ui/badge';
import { RegistrationCard } from '@/components/RegistrationCard';
import { Separator } from '@/components/ui/separator';
import { EVENT_INFO } from '@/data/event';
import type { EventCapacityStatus } from '@/lib/api';

interface HeroProps {
  status: EventCapacityStatus | null;
  onRegistered: () => void;
}

export function Hero({ status, onRegistered }: HeroProps) {
  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-6 lg:col-span-6 lg:pt-2">
          <Badge variant="secondary">{EVENT_INFO.admission}</Badge>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Connect <span className="text-primary">2026</span>
            </h1>
            <p className="text-lg font-medium text-muted-foreground sm:text-xl">
              {EVENT_INFO.theme}
            </p>
          </div>

          <Separator />

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Data e hora</dt>
              <dd className="mt-1 font-medium text-foreground">
                {EVENT_INFO.dateLabel}, {EVENT_INFO.timeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Local</dt>
              <dd className="mt-1 font-medium text-foreground">
                {EVENT_INFO.location}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Organização</dt>
              <dd className="mt-1 font-medium text-foreground">
                {EVENT_INFO.organization}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contacto</dt>
              <dd className="mt-1 font-medium text-foreground">
                <a
                  href={EVENT_INFO.contactHref}
                  className="underline-offset-4 hover:text-primary hover:underline"
                >
                  {EVENT_INFO.contactPhone}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-6">
          <RegistrationCard status={status} onRegistered={onRegistered} />
        </div>
      </div>
    </section>
  );
}
