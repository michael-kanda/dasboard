'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLoadingOverlay from '@/components/dashboard/DashboardLoadingOverlay';

export default function DashboardSyncPending({
  projectId,
  dateRange,
  backgroundOnly = false,
}: {
  projectId: string;
  dateRange: string;
  backgroundOnly?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    let errorRetryMs = 8_000;

    const synchronize = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/dashboard-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateRange }),
        });
        if (cancelled) return;
        if (response.status === 202) {
          retryTimer = window.setTimeout(synchronize, 4_000);
          return;
        }
        if (response.ok) {
          router.refresh();
          return;
        }
        if (!backgroundOnly) {
          retryTimer = window.setTimeout(synchronize, errorRetryMs);
          errorRetryMs = Math.min(errorRetryMs * 2, 60_000);
        }
      } catch {
        if (!cancelled && !backgroundOnly) {
          retryTimer = window.setTimeout(synchronize, errorRetryMs);
          errorRetryMs = Math.min(errorRetryMs * 2, 60_000);
        }
      }
    };

    void synchronize();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [backgroundOnly, dateRange, projectId, router]);

  return backgroundOnly ? null : <DashboardLoadingOverlay />;
}
