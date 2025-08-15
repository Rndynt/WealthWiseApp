import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PullToRefreshProps {
  onRefresh?: () => Promise<void> | void;
  children: React.ReactNode;
  enabled?: boolean;
}

export function EnhancedPullToRefresh({ onRefresh, children, enabled = true }: PullToRefreshProps) {
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'canRefresh' | 'refreshing'>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const PULL_THRESHOLD = 80; // Distance needed to trigger refresh
  const MAX_PULL_DISTANCE = 120; // Maximum pull distance
  const PULL_RESISTANCE = 0.4; // How much resistance when pulling

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || window.scrollY > 5) return;
    
    setTouchStartY(e.touches[0].clientY);
    setTouchStartTime(Date.now());
    setPullState('idle');
    setPullDistance(0);
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || touchStartY === 0 || window.scrollY > 5) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY;
    const timeDelta = Date.now() - touchStartTime;

    // Only consider downward pulls that are reasonably fast
    if (deltaY <= 0 || timeDelta > 300) return;

    // Apply resistance to make pulling feel natural
    const resistedDistance = Math.pow(deltaY * PULL_RESISTANCE, 0.8);
    const clampedDistance = Math.min(resistedDistance, MAX_PULL_DISTANCE);

    if (clampedDistance > 20) {
      e.preventDefault();
      setPullDistance(clampedDistance);
      
      if (clampedDistance >= PULL_THRESHOLD && pullState !== 'canRefresh') {
        setPullState('canRefresh');
        // Haptic feedback on capable devices
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } else if (clampedDistance < PULL_THRESHOLD && pullState === 'canRefresh') {
        setPullState('pulling');
      } else if (pullState === 'idle') {
        setPullState('pulling');
      }
    }
  }, [enabled, touchStartY, touchStartTime, pullState, PULL_THRESHOLD]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || pullState === 'idle') {
      setTouchStartY(0);
      return;
    }

    if (pullState === 'canRefresh') {
      setPullState('refreshing');
      
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // Default refresh behavior
          window.location.reload();
        }
        
        toast({
          title: "Refreshed",
          description: "Content has been updated",
        });
      } catch (error) {
        console.error('Refresh error:', error);
        toast({
          title: "Refresh Failed",
          description: "Unable to refresh content",
          variant: "destructive",
        });
      }
    }

    // Reset state with smooth animation
    setTimeout(() => {
      setPullState('idle');
      setPullDistance(0);
      setTouchStartY(0);
    }, pullState === 'canRefresh' ? 500 : 200);
  }, [enabled, pullState, onRefresh, toast]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const getIndicatorText = () => {
    switch (pullState) {
      case 'pulling':
        return 'Pull down to refresh';
      case 'canRefresh':
        return 'Release to refresh';
      case 'refreshing':
        return 'Refreshing...';
      default:
        return '';
    }
  };

  const getIconRotation = () => {
    if (pullState === 'canRefresh') return 180;
    if (pullState === 'refreshing') return 0;
    return Math.min(pullDistance * 2, 180);
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull indicator */}
      {pullState !== 'idle' && (
        <div 
          className="absolute left-0 right-0 top-0 z-50 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 transition-all duration-200"
          style={{
            height: `${Math.max(pullDistance * 0.6, 0)}px`,
            opacity: Math.min(pullDistance / 40, 1),
          }}
        >
          <div className="flex flex-col items-center space-y-1 px-4 py-2">
            <div className="relative">
              {pullState === 'refreshing' ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <ArrowDown 
                  className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-300"
                  style={{ 
                    transform: `rotate(${getIconRotation()}deg)`,
                    color: pullState === 'canRefresh' ? '#2563eb' : undefined
                  }}
                />
              )}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {getIndicatorText()}
            </span>
          </div>
        </div>
      )}

      {/* Content container */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: pullState !== 'idle' ? `translateY(${Math.max(pullDistance * 0.3, 0)}px)` : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
}