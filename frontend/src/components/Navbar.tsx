import { EVENT_INFO } from '@/data/event';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="text-sm font-bold tracking-tight text-foreground">
          {EVENT_INFO.name}
        </a>

        <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
          <span>{EVENT_INFO.shortDateLabel}</span>
          <span>·</span>
          <span>{EVENT_INFO.location}</span>
        </div>

        <Button asChild size="sm">
          <a href="#inscricao">Inscrever-se</a>
        </Button>
      </div>
    </header>
  );
}
