import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PWARefreshButton() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (needRefresh) {
          window.location.reload();
        }
      });

      // Check for waiting service worker
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          setNeedRefresh(true);
        }
      });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setNeedRefresh(true);
        }
      });
    }
  }, [needRefresh]);

  const handleRefresh = async () => {
    if (!('serviceWorker' in navigator)) {
      // Regular refresh for non-PWA browsers
      window.location.reload();
      return;
    }

    setIsRefreshing(true);
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration?.waiting) {
        // Tell the waiting SW to become the active SW
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setNeedRefresh(false);
      } else {
        // No waiting SW, just reload
        window.location.reload();
      }
      
      toast({
        title: "Memperbarui aplikasi...",
        description: "Aplikasi akan dimuat ulang dengan versi terbaru",
      });
    } catch (error) {
      console.error('Error refreshing:', error);
      // Fallback to regular refresh
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceRefresh = () => {
    // Force clear cache and reload
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });
    } else {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2"
        data-testid="button-refresh"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {needRefresh ? 'Update Tersedia' : 'Refresh'}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleForceRefresh}
        className="flex items-center gap-2"
        title="Force refresh - clear cache dan reload"
        data-testid="button-force-refresh"
      >
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}