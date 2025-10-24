import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { WorkspaceSubscriptionLimits } from '@/types';

interface WorkspaceQuotaBannerProps {
  className?: string;
  limits?: WorkspaceSubscriptionLimits;
  isLoading?: boolean;
}

function formatLimit(limit: number | null | undefined) {
  if (limit === null || limit === undefined) {
    return '∞';
  }
  return limit.toString();
}

export function WorkspaceQuotaBanner({
  className,
  limits,
  isLoading,
}: WorkspaceQuotaBannerProps) {
  const shouldFetch = typeof limits === 'undefined' && typeof isLoading === 'undefined';

  const { data: fetchedLimits, isLoading: fetchedLoading } = useQuery<WorkspaceSubscriptionLimits>({
    queryKey: ['/api/user/subscription-limits'],
    enabled: shouldFetch,
  });

  const quota = limits ?? fetchedLimits;
  const loadingState = isLoading ?? (shouldFetch ? fetchedLoading : false);

  const limitAlerts = useMemo(() => {
    if (!quota) {
      return [] as ReactNode[];
    }

    const alerts: ReactNode[] = [];

    if (quota.personalLimit !== null && quota.personalOwned >= quota.personalLimit) {
      alerts.push(
        <Alert key="personal-limit" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Batas workspace personal tercapai</AlertTitle>
          <AlertDescription>
            Anda telah menggunakan {quota.personalOwned} dari {quota.personalLimit} workspace personal yang tersedia.
          </AlertDescription>
        </Alert>
      );
    }

    if (quota.sharedLimit === 0) {
      alerts.push(
        <Alert key="shared-disabled" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Shared workspace belum tersedia</AlertTitle>
          <AlertDescription>
            Paket Anda saat ini tidak mendukung pembuatan shared workspace. Upgrade paket untuk mengaktifkannya.
          </AlertDescription>
        </Alert>
      );
    } else if (
      quota.sharedLimit !== null &&
      quota.sharedLimit !== 0 &&
      quota.sharedOwned >= quota.sharedLimit
    ) {
      alerts.push(
        <Alert key="shared-limit" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Batas shared workspace tercapai</AlertTitle>
          <AlertDescription>
            Anda telah menggunakan {quota.sharedOwned} dari {quota.sharedLimit} shared workspace yang tersedia.
          </AlertDescription>
        </Alert>
      );
    }

    return alerts;
  }, [quota]);

  if (loadingState) {
    return (
      <div className={cn('rounded-lg border border-border/50 bg-muted/40 p-4 space-y-3', className)}>
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!quota) {
    return null;
  }

  return (
    <div className={cn('rounded-lg border border-border/60 bg-muted/40 p-4 space-y-4', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ringkasan kuota workspace</h3>
          <p className="text-xs text-muted-foreground">
            Undangan ke shared workspace tidak mengurangi kuota personal Anda.
          </p>
        </div>
        <div className="rounded-md border border-border/40 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-medium text-foreground">Dimiliki</span>
          </div>
          <p className="mt-1 text-[11px] leading-tight">
            Total: {quota.personalOwned + quota.sharedOwned} workspace dimiliki
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border/40 bg-background/70 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Personal</span>
            <span className="text-xs text-muted-foreground">
              {quota.personalOwned}/{formatLimit(quota.personalLimit)} dimiliki
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Bergabung di workspace personal lain: <span className="font-medium text-foreground">{quota.personalMember}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hanya workspace personal yang Anda buat yang dihitung terhadap kuota personal.
          </p>
        </div>

        <div className="rounded-md border border-border/40 bg-background/70 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Shared</span>
            <span className="text-xs text-muted-foreground">
              {quota.sharedLimit === 0 ? '—' : `${quota.sharedOwned}/${formatLimit(quota.sharedLimit)} dimiliki`}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Bergabung di shared workspace lain: <span className="font-medium text-foreground">{quota.sharedMember}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Undangan ke shared workspace lain tidak memotong kuota personal Anda.
          </p>
          {quota.maxMembers && quota.maxMembers > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Kapasitas maksimal anggota per shared workspace: {quota.maxMembers} orang.
            </p>
          )}
        </div>
      </div>

      {limitAlerts.length > 0 && <div className="space-y-2">{limitAlerts}</div>}
    </div>
  );
}

export default WorkspaceQuotaBanner;
