import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import type { Flow, FlowRecord, UserRecord } from './types.js';

type SqlClient = {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
  end?: () => Promise<void>;
};

type UserRow = QueryResultRow & {
  id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  google_subject: string | null;
  created_at: string | Date;
};

type FlowRow = QueryResultRow & {
  id: string;
  owner_id: string;
  name: string;
  nodes: Flow['nodes'];
  edges: Flow['edges'];
  created_at: string | Date;
  updated_at: string | Date;
};

export type FlowStore = ReturnType<typeof createPostgresStore>;

function toIsoString(value: string | Date) {
  return new Date(value).toISOString();
}

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    ...(row.name ? { name: row.name } : {}),
    ...(row.password_hash ? { passwordHash: row.password_hash } : {}),
    ...(row.google_subject ? { googleSubject: row.google_subject } : {}),
    createdAt: toIsoString(row.created_at),
  };
}

function toFlow(row: FlowRow): FlowRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    nodes: row.nodes,
    edges: row.edges,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export function createPostgresStore(options: { pool?: SqlClient; connectionString?: string } = {}) {
  const connectionString = options.connectionString || process.env.DATABASE_URL;
  if (!options.pool && !connectionString) {
    throw new Error('DATABASE_URL is required. Configure PostgreSQL before starting the API.');
  }

  const pool: SqlClient =
    options.pool ||
    new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX) || 10,
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS) || 10_000,
    });

  const initialized = pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT,
      google_subject TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flows (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      nodes JSONB NOT NULL,
      edges JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS flows_owner_updated_idx
      ON flows (owner_id, updated_at DESC);
  `);

  const ready = () => initialized;

  return {
    async healthCheck() {
      await ready();
      await pool.query('SELECT 1');
    },

    async findUserByEmail(email: string) {
      await ready();
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] ? toUser(result.rows[0]) : undefined;
    },

    async findUserByGoogleSubject(subject: string) {
      await ready();
      const result = await pool.query<UserRow>('SELECT * FROM users WHERE google_subject = $1', [
        subject,
      ]);
      return result.rows[0] ? toUser(result.rows[0]) : undefined;
    },

    async createUser(user: UserRecord) {
      await ready();
      await pool.query(
        `INSERT INTO users
          (id, email, name, password_hash, google_subject, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          user.email,
          user.name || null,
          user.passwordHash || null,
          user.googleSubject || null,
          user.createdAt,
        ],
      );
      return user;
    },

    async linkGoogle(userId: string, subject: string, name?: string) {
      await ready();
      await pool.query(
        `UPDATE users
         SET google_subject = $2, name = COALESCE(name, $3)
         WHERE id = $1`,
        [userId, subject, name || null],
      );
    },

    async listFlows(userId: string) {
      await ready();
      const result = await pool.query<FlowRow>(
        'SELECT * FROM flows WHERE owner_id = $1 ORDER BY updated_at DESC',
        [userId],
      );
      return result.rows.map(toFlow);
    },

    async getFlow(userId: string, flowId: string) {
      await ready();
      const result = await pool.query<FlowRow>(
        'SELECT * FROM flows WHERE id = $1 AND owner_id = $2',
        [flowId, userId],
      );
      return result.rows[0] ? toFlow(result.rows[0]) : null;
    },

    async createFlow(flow: FlowRecord) {
      await ready();
      await pool.query(
        `INSERT INTO flows
          (id, owner_id, name, nodes, edges, created_at, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
        [
          flow.id,
          flow.ownerId,
          flow.name,
          JSON.stringify(flow.nodes),
          JSON.stringify(flow.edges),
          flow.createdAt,
          flow.updatedAt,
        ],
      );
      return flow;
    },

    async updateFlow(userId: string, flowId: string, flow: Flow, name?: string) {
      await ready();
      const normalizedName = name?.trim() || null;
      const result = await pool.query<FlowRow>(
        `UPDATE flows
         SET nodes = $3::jsonb,
             edges = $4::jsonb,
             name = COALESCE($5, name),
             updated_at = $6
         WHERE id = $1 AND owner_id = $2
         RETURNING *`,
        [
          flowId,
          userId,
          JSON.stringify(flow.nodes),
          JSON.stringify(flow.edges),
          normalizedName,
          new Date().toISOString(),
        ],
      );
      return result.rows[0] ? toFlow(result.rows[0]) : null;
    },

    async deleteFlow(userId: string, flowId: string) {
      await ready();
      const result = await pool.query('DELETE FROM flows WHERE id = $1 AND owner_id = $2', [
        flowId,
        userId,
      ]);
      return (result.rowCount || 0) > 0;
    },

    async close() {
      await pool.end?.();
    },
  };
}
