'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLoadingOverlay from '@/components/dashboard/DashboardLoadingOverlay';

export default function DashboardSyncPending({ projectId, dateRange, backgroundOnly = false }: {
  projectId: string; dateRange: string; backgroundOnly?: boolean;
}) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    let started = false;
    let active = false;
    let stopped = false;
    setWaiting(false);
    const url = `/api/projects/${projectId}/dashboard-sync`;
    const stop = () => { stopped = true; setWaiting(true); };
    const check = async () => {
      if (stopped || active || controller.signal.aborted || document.hidden) return;
      active = true;
      try {
        const initial = !started;
        started = true;
        const response = await fetch(initial ? url : `${url}?dateRange=${dateRange}`, {
          method: initial ? 'POST' : 'GET',
          headers: initial ? { 'Content-Type': 'application/json' } : undefined,
          body: initial ? JSON.stringify({ dateRange }) : undefined,
          signal: controller.signal,
          cache: 'no-store',
        });
        if (controller.signal.aborted) return;
        if (!response.ok) { stop(); return; }
        const data = await response.json();
        if (data.status === 'ready' || (initial && data.success && !data.pending)) {
          stopped = true;
          router.refresh();
          return;
        }
        if (data.status === 'scheduled' || ++polls >= 8) { stop(); return; }
        timer = setTimeout(check, Math.min(10_000 * 2 ** (polls - 1), 60_000));
      } catch {
        if (!controller.signal.aborted) stop();
      } finally { active = false; }
    };
    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      if (!document.hidden) void check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    void check();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dateRange, projectId, router]);
  return backgroundOnly ? null : <DashboardLoadingOverlay waiting={waiting} />;
}
