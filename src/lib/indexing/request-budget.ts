

export class InspectionBudgetExceededError extends Error {
  constructor() {
    super('Das Zeitbudget für diesen Indexierungsabgleich ist aufgebraucht.');
    this.name = 'InspectionBudgetExceededError';
  }
}

export function getRequestTimeout(deadlineAt: number, maximumMs: number, reserveMs: number) {
  const remaining = deadlineAt - Date.now() - reserveMs;
  if (remaining < 1_000) {
    throw new InspectionBudgetExceededError();
  }
  return Math.min(maximumMs, remaining);
}
