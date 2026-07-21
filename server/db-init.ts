import 'dotenv/config';
import { createPostgresStore } from './store.js';

const store = createPostgresStore();

try {
  await store.healthCheck();
  console.log('PostgreSQL schema is ready.');
} finally {
  await store.close();
}
