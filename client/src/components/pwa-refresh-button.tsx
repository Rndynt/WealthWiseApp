import { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PWAPullToRefresh() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
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

    // Touch events for pull-to-refresh
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY.current > 0) {
        currentY.current = e.touches[0].clientY;
        const distance = currentY.current - startY.current;
        
        if (distance > 0) {
          e.preventDefault();
          setIsPulling(true);
          setPullDistance(Math.min(distance, 150));
          
          // Apply transform to body for pull effect
          document.body.style.transform = `translateY(${Math.min(distance * 0.5, 75)}px)`;
          document.body.style.transition = 'none';
        }
      }
    };

    const handleTouchEnd = () => {
      if (isPulling && pullDistance > 80) {
        handleRefresh();
      }
      
      // Reset body transform
      document.body.style.transform = '';
      document.body.style.transition = 'transform 0.3s ease-out';
      setTimeout(() => {
        document.body.style.transition = '';
      }, 300);
      
      setIsPulling(false);
      setPullDistance(0);
      startY.current = 0;
      currentY.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [needRefresh, isPulling, pullDistance]);

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

  const refreshThreshold = 80;
  const maxPullDistance = 150;

  return (
    <>
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div 
          className="fixed left-0 right-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-all duration-200"
          style={{ 
            top: 'env(safe-area-inset-top, 0px)',
            height: `${Math.min(pullDistance, maxPullDistance)}px`,
            transform: `translateY(-${maxPullDistance - pullDistance}px)`
          }}
        >
          <div className="flex flex-col items-center">
            <RefreshCw 
              className={`h-6 w-6 text-green-600 transition-transform duration-200 ${
                pullDistance > refreshThreshold ? 'animate-spin' : ''
              }`}
              style={{ 
                transform: `rotate(${pullDistance * 2}deg)` 
              }}
            />
            <span className="text-xs text-gray-600 mt-1">
              {pullDistance > refreshThreshold ? 'Lepas untuk refresh' : 'Tarik ke bawah'}
            </span>
          </div>
        </div>
      )}

      {/* Update notification */}
      {needRefresh && !isPulling && (
        <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
          <div className="bg-green-600 text-white p-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Update tersedia</span>
              <button
                onClick={handleRefresh}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay during refresh */}
      {isRefreshing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 text-green-600 animate-spin" />
            <span className="text-sm text-gray-600 mt-2">Memperbarui aplikasi...</span>
          </div>
        </div>
      )}
    </>
  );
}