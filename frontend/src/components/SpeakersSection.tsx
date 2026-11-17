import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SPEAKERS } from '@/data/event';

export function SpeakersSection() {
  return (
    <section id="oradores" className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Oradores
          </h2>
          <p className="text-sm text-muted-foreground">
            Subtemas de cada sessão do Connect 2026.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SPEAKERS.map((speaker) => (
            <Card key={speaker.id} className="justify-between">
              <CardHeader>
                <Avatar className="size-24 border bg-secondary">
                  {speaker.imageUrl ? (
                    <AvatarImage
                      src={speaker.imageUrl}
                      alt={speaker.name}
                      className="object-cover object-top"
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                    {speaker.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="pt-2 text-sm font-semibold leading-snug text-primary">
                  {speaker.subtheme}
                </p>
              </CardHeader>

              <CardContent className="space-y-3">
                <Separator />
                <div className="space-y-1">
                  <CardTitle className="text-base">{speaker.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {speaker.role}
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
