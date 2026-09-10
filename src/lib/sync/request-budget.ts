import { AsyncLocalStorage } from 'node:async_hooks';

const budgets = new AsyncLocalStorage<AbortSignal>();

export function requestBudgetOptions(): { signal?: AbortSignal } {
  const signal = budgets.getStore();
  signal?.throwIfAborted();
  return signal ? { signal } : {};
}

export async function withRequestBudget<T>(deadlineAt: number, operation: () => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const remaining = deadlineAt - Date.now();
  const abort = () => controller.abort(new DOMException('Synchronisierungszeitbudget erschöpft', 'TimeoutError'));
  if (remaining <= 0) abort();
  const timer = setTimeout(abort, Math.max(0, remaining));
  try {
    return await budgets.run(controller.signal, async () => {
      controller.signal.throwIfAborted();
      return operation();
    });
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
