import assert from 'node:assert/strict';
import test from 'node:test';
import { requestBudgetOptions, withRequestBudget } from '../../src/lib/sync/request-budget.ts';

test('aborts in-flight requests and prevents later requests after the deadline', async () => {
  await withRequestBudget(Date.now() + 20, async () => {
    const { signal } = requestBudgetOptions();
    assert.ok(signal);
    await new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
    assert.equal(signal.aborted, true);
    assert.throws(() => requestBudgetOptions(), { name: 'TimeoutError' });
  });
  assert.equal(requestBudgetOptions().signal, undefined);
});

test('isolates concurrent budgets and rejects expired jobs', async () => {
  let invoked = false;
  await assert.rejects(withRequestBudget(Date.now() - 1, async () => { invoked = true; }), { name: 'TimeoutError' });
  assert.equal(invoked, false);
  const signals = await Promise.all([1, 2].map(() => withRequestBudget(Date.now() + 1000, async () => {
    await Promise.resolve();
    return requestBudgetOptions().signal;
  })));
  assert.notEqual(signals[0], signals[1]);
});
