import { useCallback, useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { Navbar } from '@/components/Navbar';
import { SpeakersSection } from '@/components/SpeakersSection';
import { Toaster } from '@/components/ui/sonner';
import { fetchEventStatus, type EventCapacityStatus } from '@/lib/api';

export function App() {
  const [status, setStatus] = useState<EventCapacityStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    const next = await fetchEventStatus();
    if (next) {
      setStatus(next);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero status={status} onRegistered={refreshStatus} />
        <SpeakersSection />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

export default App;
