import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const dataDirectory = await mkdtemp(path.join(process.cwd(), 'server', 'data-test-'));
process.env.DATA_DIR = dataDirectory;
const { createFlow, deleteFlow, getFlow, listFlows, updateFlow } = await import('../store.js');

test.after(async () => rm(dataDirectory, { recursive: true, force: true }));

const now = new Date().toISOString();
const emptyFlow = { nodes: [], edges: [] };

test('flow CRUD is restricted to the owner', async () => {
  await createFlow({
    id: 'flow-1',
    ownerId: 'owner-1',
    name: 'Owned flow',
    createdAt: now,
    updatedAt: now,
    ...emptyFlow,
  });

  assert.equal((await listFlows('owner-1')).length, 1);
  assert.equal((await listFlows('stranger')).length, 0);
  assert.equal(await getFlow('stranger', 'flow-1'), null);
  assert.equal(await updateFlow('stranger', 'flow-1', emptyFlow, 'Hijacked'), null);
  assert.equal(await deleteFlow('stranger', 'flow-1'), false);

  const updated = await updateFlow('owner-1', 'flow-1', emptyFlow, 'Renamed');
  assert.equal(updated?.name, 'Renamed');
  assert.equal(await deleteFlow('owner-1', 'flow-1'), true);
  assert.equal(await getFlow('owner-1', 'flow-1'), null);
});
