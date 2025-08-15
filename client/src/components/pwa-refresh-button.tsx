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
        
        if (distance > 20) { // Increased threshold to prevent accidental triggering
          e.preventDefault();
          setIsPulling(true);
          const normalizedDistance = Math.min(distance - 20, 120); // Subtract offset and limit range
          setPullDistance(normalizedDistance);
          
          // Smoother transform with easing - more dramatic visual feedback
          const pullAmount = Math.min(normalizedDistance * 0.6, 80);
          document.body.style.transform = `translateY(${pullAmount}px)`;
          document.body.style.transition = 'none';
          document.body.style.overflow = 'hidden';
          
          // Add background gradient effect during pull
          document.body.style.background = `linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 0%, transparent ${pullAmount}px)`;
        }
      }
    };

    const handleTouchEnd = () => {
      if (isPulling && pullDistance > 60) { // Lower threshold for triggering
        handleRefresh();
      }
      
      // Smooth reset with better animation
      document.body.style.transform = '';
      document.body.style.background = '';
      document.body.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      document.body.style.overflow = '';
      
      setTimeout(() => {
        document.body.style.transition = '';
      }, 500);
      
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
          className="fixed left-0 right-0 z-50 flex items-center justify-center bg-gradient-to-b from-blue-50/95 to-white/95 backdrop-blur-md transition-all duration-300 shadow-sm"
          style={{ 
            top: 'env(safe-area-inset-top, 0px)',
            height: `${Math.min(pullDistance + 40, maxPullDistance)}px`,
            transform: `translateY(-${Math.max(maxPullDistance - pullDistance - 40, 0)}px)`,
            borderRadius: '0 0 16px 16px'
          }}
        >
          <div className="flex flex-col items-center animate-in fade-in duration-200">
            <div className="relative">
              <RefreshCw 
                className={`h-5 w-5 text-blue-600 transition-all duration-300 ${
                  pullDistance > refreshThreshold ? 'animate-spin scale-110' : ''
                }`}
                style={{ 
                  transform: `rotate(${pullDistance * 3}deg) ${pullDistance > refreshThreshold ? 'scale(1.1)' : ''}` 
                }}
              />
              {pullDistance > refreshThreshold && (
                <div className="absolute -inset-2 border-2 border-blue-300 rounded-full animate-pulse"></div>
              )}
            </div>
            <span className="text-xs text-blue-700 mt-2 font-medium animate-in slide-in-from-top-2 duration-200">
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