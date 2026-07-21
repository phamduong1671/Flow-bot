import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestStore } from './test-store.js';

const store = createTestStore();
test.after(() => store.close());

const now = new Date().toISOString();
const emptyFlow = { nodes: [], edges: [] };

test('flow CRUD is restricted to the owner', async () => {
  await store.createUser({ id: 'owner-1', email: 'owner@example.com', createdAt: now });
  await store.createFlow({
    id: 'flow-1',
    ownerId: 'owner-1',
    name: 'Owned flow',
    createdAt: now,
    updatedAt: now,
    ...emptyFlow,
  });

  assert.equal((await store.listFlows('owner-1')).length, 1);
  assert.equal((await store.listFlows('stranger')).length, 0);
  assert.equal(await store.getFlow('stranger', 'flow-1'), null);
  assert.equal(await store.updateFlow('stranger', 'flow-1', emptyFlow, 'Hijacked'), null);
  assert.equal(await store.deleteFlow('stranger', 'flow-1'), false);

  const updated = await store.updateFlow('owner-1', 'flow-1', emptyFlow, 'Renamed');
  assert.equal(updated?.name, 'Renamed');
  assert.equal(await store.deleteFlow('owner-1', 'flow-1'), true);
  assert.equal(await store.getFlow('owner-1', 'flow-1'), null);
});
