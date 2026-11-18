import { useCallback, useEffect, useState } from 'react';
import { FlyerSection } from '@/components/FlyerSection';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { Navbar } from '@/components/Navbar';
import { RegistrationsListPage } from '@/components/RegistrationsListPage';
import { SpeakersSection } from '@/components/SpeakersSection';
import { TicketPassView } from '@/components/TicketPassView';
import { Toaster } from '@/components/ui/sonner';
import { fetchEventStatus, type EventCapacityStatus } from '@/lib/api';

type AppRoute =
  | { view: 'home' }
  | { view: 'ticket'; token: string; autoDownloadPdf: boolean }
  | { view: 'registrations' };

function resolveRoute(): AppRoute {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  if (path.startsWith('/inscritos')) {
    return { view: 'registrations' };
  }

  const token = params.get('token') ?? params.get('convite');
  const autoDownloadPdf = params.get('download') === 'pdf';
  if (token) {
    return { view: 'ticket', token, autoDownloadPdf };
  }

  if (path.startsWith('/convite')) {
    return { view: 'ticket', token: '', autoDownloadPdf };
  }

  return { view: 'home' };
}

export function App() {
  const [status, setStatus] = useState<EventCapacityStatus | null>(null);
  const route = resolveRoute();

  const refreshStatus = useCallback(async () => {
    const next = await fetchEventStatus();
    if (next) {
      setStatus(next);
    }
  }, []);

  useEffect(() => {
    if (route.view === 'home') {
      void refreshStatus();
    }
  }, [refreshStatus, route.view]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        {route.view === 'registrations' ? (
          <RegistrationsListPage />
        ) : route.view === 'ticket' ? (
          <TicketPassView
            token={route.token}
            autoDownloadPdf={route.autoDownloadPdf}
          />
        ) : (
          <>
            <FlyerSection />
            <Hero status={status} onRegistered={refreshStatus} />
            <SpeakersSection />
          </>
        )}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

export default App;
