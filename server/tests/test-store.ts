import { newDb } from 'pg-mem';
import { createPostgresStore, type FlowStore } from '../store.js';

export function createTestStore(): FlowStore {
  const database = newDb();
  const adapter = database.adapters.createPg();
  const pool = new adapter.Pool();
  return createPostgresStore({ pool });
}
