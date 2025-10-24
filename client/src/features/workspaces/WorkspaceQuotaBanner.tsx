import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Share2, User } from 'lucide-react';
import type { WorkspaceSubscriptionLimits } from '@/types/subscription';

interface WorkspaceQuotaBannerProps {
  limits: WorkspaceSubscriptionLimits;
}

const formatLimit = (limit: number | null) => (limit === null ? '∞' : limit);

const calculateProgress = (used: number, limit: number | null) => {
  if (limit === null || limit === 0) {
    return limit === 0 && used > 0 ? 100 : 0;
  }

  const percentage = (used / limit) * 100;
  return Math.min(100, Math.max(0, percentage));
};

export function WorkspaceQuotaBanner({ limits }: WorkspaceQuotaBannerProps) {
  const { personal, shared, sharedInvitations } = limits.breakdown;

  const personalDescription = personal.limit === null
    ? 'Kuota workspace pribadi Anda tidak terbatas.'
    : personal.remaining !== null && personal.remaining > 0
      ? `Sisa ${personal.remaining} workspace pribadi dari ${personal.limit}.`
      : 'Anda telah menggunakan semua kuota workspace pribadi.';

  let sharedDescription = '';
  if (!limits.canCreateSharedWorkspace) {
    sharedDescription = 'Paket Anda belum mendukung pembuatan shared workspace.';
  } else if (shared.limit === null) {
    sharedDescription = 'Kuota shared workspace yang Anda buat tidak terbatas.';
  } else if (shared.remaining !== null && shared.remaining > 0) {
    sharedDescription = `Sisa ${shared.remaining} shared workspace dari ${shared.limit}.`;
  } else {
    sharedDescription = 'Kuota shared workspace yang Anda buat telah habis.';
  }

  return (
    <Card className="border-dashed border-primary/20 bg-muted/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Status Kuota Workspace</CardTitle>
        <CardDescription className="text-xs">
          Pantau penggunaan workspace pribadi dan shared yang Anda miliki.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </span>
              Workspace pribadi
            </span>
            <Badge variant={personal.limit !== null && personal.remaining !== null && personal.remaining <= 0 ? 'destructive' : 'secondary'}>
              {personal.used}/{formatLimit(personal.limit)}
            </Badge>
          </div>
          <Progress value={calculateProgress(personal.used, personal.limit)} className="h-2" />
          <p className="text-xs text-muted-foreground">{personalDescription}</p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <Share2 className="h-3.5 w-3.5 text-primary" />
              </span>
              Shared workspace yang Anda buat
            </span>
            <Badge variant={limits.canCreateSharedWorkspace && shared.limit !== null && shared.remaining !== null && shared.remaining <= 0 ? 'destructive' : 'secondary'}>
              {shared.used}/{formatLimit(shared.limit)}
            </Badge>
          </div>
          <Progress value={calculateProgress(shared.used, shared.limit)} className="h-2" />
          <p className="text-xs text-muted-foreground">{sharedDescription}</p>
        </section>

        <section className="rounded-md border border-dashed border-muted-foreground/40 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">
            Anda bergabung di {sharedInvitations.used} shared workspace milik pengguna lain. Undangan ke shared workspace tidak
            mengurangi kuota workspace pribadi Anda.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}

export default WorkspaceQuotaBanner;
