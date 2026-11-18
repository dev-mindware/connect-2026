import { useCallback, useEffect, useState } from 'react';
import { FlyerSection } from '@/components/FlyerSection';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { Navbar } from '@/components/Navbar';
import { SpeakersSection } from '@/components/SpeakersSection';
import { TicketPassView } from '@/components/TicketPassView';
import { Toaster } from '@/components/ui/sonner';
import { fetchEventStatus, type EventCapacityStatus } from '@/lib/api';

function getTicketRouteState(): {
  token: string | null;
  autoDownloadPdf: boolean;
} {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? params.get('convite');
  const autoDownloadPdf = params.get('download') === 'pdf';
  if (token) return { token, autoDownloadPdf };
  if (window.location.pathname.startsWith('/convite')) {
    return { token: '', autoDownloadPdf };
  }
  return { token: null, autoDownloadPdf: false };
}

export function App() {
  const [status, setStatus] = useState<EventCapacityStatus | null>(null);
  const { token: ticketToken, autoDownloadPdf } = getTicketRouteState();

  const refreshStatus = useCallback(async () => {
    const next = await fetchEventStatus();
    if (next) {
      setStatus(next);
    }
  }, []);

  useEffect(() => {
    if (ticketToken === null) {
      void refreshStatus();
    }
  }, [refreshStatus, ticketToken]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        {ticketToken !== null ? (
          <TicketPassView
            token={ticketToken}
            autoDownloadPdf={autoDownloadPdf}
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
