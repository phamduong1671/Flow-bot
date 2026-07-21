import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Database, Flow, FlowRecord, UserRecord } from './types.js';

const dataDirectory = path.resolve(
  process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || 'server/data',
);
const databasePath = path.join(dataDirectory, 'db.json');
const emptyDatabase: Database = { users: [], flows: {} };
let writeQueue = Promise.resolve();

async function readDatabase(): Promise<Database> {
  try {
    const database = JSON.parse(await readFile(databasePath, 'utf8')) as Database;
    const flows: Record<string, FlowRecord> = {};
    for (const [key, value] of Object.entries(database.flows || {})) {
      const candidate = value as FlowRecord;
      if (candidate.id && candidate.ownerId) {
        flows[candidate.id] = candidate;
        continue;
      }
      const timestamp = new Date(0).toISOString();
      const id = `legacy-${key}`;
      flows[id] = {
        ...(value as Flow),
        id,
        ownerId: key,
        name: 'Default flow',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    }
    return { users: database.users || [], flows };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return structuredClone(emptyDatabase);
  }
}

async function mutate(update: (database: Database) => void) {
  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const database = await readDatabase();
    update(database);
    const temporaryPath = `${databasePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(database, null, 2), 'utf8');
    await rename(temporaryPath, databasePath);
  });
  await writeQueue;
}

export async function findUserByEmail(email: string) {
  return (await readDatabase()).users.find((user) => user.email === email);
}

export async function findUserByGoogleSubject(subject: string) {
  return (await readDatabase()).users.find((user) => user.googleSubject === subject);
}

export async function createUser(user: UserRecord) {
  await mutate((database) => database.users.push(user));
  return user;
}

export async function linkGoogle(userId: string, subject: string, name?: string) {
  await mutate((database) => {
    const user = database.users.find((candidate) => candidate.id === userId);
    if (user) {
      user.googleSubject = subject;
      user.name ||= name;
    }
  });
}

export async function listFlows(userId: string) {
  return Object.values((await readDatabase()).flows)
    .filter((flow) => flow.ownerId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getFlow(userId: string, flowId: string) {
  const flow = (await readDatabase()).flows[flowId];
  return flow?.ownerId === userId ? flow : null;
}

export async function createFlow(flow: FlowRecord) {
  await mutate((database) => {
    database.flows[flow.id] = flow;
  });
  return flow;
}

export async function updateFlow(userId: string, flowId: string, flow: Flow, name?: string) {
  let updated: FlowRecord | null = null;
  await mutate((database) => {
    const current = database.flows[flowId];
    if (!current || current.ownerId !== userId) return;
    updated = {
      ...current,
      ...flow,
      name: name?.trim() || current.name,
      updatedAt: new Date().toISOString(),
    };
    database.flows[flowId] = updated;
  });
  return updated as FlowRecord | null;
}

export async function deleteFlow(userId: string, flowId: string) {
  let deleted = false;
  await mutate((database) => {
    const current = database.flows[flowId];
    if (!current || current.ownerId !== userId) return;
    delete database.flows[flowId];
    deleted = true;
  });
  return deleted;
}
