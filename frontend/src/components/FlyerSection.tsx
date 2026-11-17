import { Card } from '@/components/ui/card';
import { EVENT_FLYER_URL, EVENT_INFO } from '@/data/event';

export function FlyerSection() {
  return (
    <section aria-label="Panfleto oficial do evento" className="border-b py-8 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Card className="mx-auto max-w-md overflow-hidden py-0">
          <img
            src={EVENT_FLYER_URL}
            alt={`Panfleto oficial do ${EVENT_INFO.name} — ${EVENT_INFO.theme}`}
            className="block h-auto w-full"
          />
        </Card>
      </div>
    </section>
  );
}
