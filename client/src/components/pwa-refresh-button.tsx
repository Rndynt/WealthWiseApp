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

    // Touch events for pull-to-refresh - improved sensitivity
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the very top and no horizontal movement
      if (window.scrollY <= 2) {
        startY.current = e.touches[0].clientY;
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY <= 2 && startY.current > 0) {
        currentY.current = e.touches[0].clientY;
        const distance = currentY.current - startY.current;
        
        // Much higher threshold - require 60px minimum pull to start
        if (distance > 60) {
          e.preventDefault();
          setIsPulling(true);
          
          // More controlled distance calculation with dampening
          const normalizedDistance = Math.min((distance - 60) * 0.4, 100);
          setPullDistance(normalizedDistance);
          
          // Smoother, less intrusive transform
          const pullAmount = Math.min(normalizedDistance * 0.3, 30);
          
          // Create isolated container instead of transforming body
          const refreshContainer = document.getElementById('refresh-container');
          if (refreshContainer) {
            refreshContainer.style.transform = `translateY(${pullAmount}px)`;
            refreshContainer.style.transition = 'none';
          }
        }
      }
    };

    const handleTouchEnd = () => {
      // Require 80px+ pull distance to trigger refresh (much higher threshold)
      if (isPulling && pullDistance > 80) {
        handleRefresh();
      }
      
      // Clean reset animation
      const refreshContainer = document.getElementById('refresh-container');
      if (refreshContainer) {
        refreshContainer.style.transform = '';
        refreshContainer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
          if (refreshContainer) {
            refreshContainer.style.transition = '';
          }
        }, 300);
      }
      
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
  const maxPullDistance = 120;

  return (
    <div id="refresh-container">
      {/* Pull-to-refresh indicator - improved positioning */}
      {isPulling && (
        <div 
          className="fixed left-4 right-4 z-40 flex items-center justify-center bg-gradient-to-b from-blue-50/90 to-transparent backdrop-blur-sm transition-all duration-200 shadow-lg border border-blue-200/50"
          style={{ 
            top: `20px`,
            height: `${Math.min(pullDistance * 0.8 + 50, maxPullDistance)}px`,
            borderRadius: '12px',
            opacity: Math.min(pullDistance / 40, 1)
          }}
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <RefreshCw 
                className={`h-4 w-4 text-blue-600 transition-all duration-200 ${
                  pullDistance > refreshThreshold ? 'animate-spin' : ''
                }`}
                style={{ 
                  transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)` 
                }}
              />
              {pullDistance > refreshThreshold && (
                <div className="absolute -inset-1 border border-blue-400 rounded-full animate-ping opacity-75"></div>
              )}
            </div>
            <span className="text-xs text-blue-700 mt-1 font-medium opacity-80">
              {pullDistance > refreshThreshold ? 'Lepas untuk refresh' : 'Tarik lebih jauh'}
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
    </div>
  );
}