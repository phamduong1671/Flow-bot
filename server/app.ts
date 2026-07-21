import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { createPostgresStore, type FlowStore } from './store.js';
import type { Flow, FlowNode, FlowRecord, UserRecord } from './types.js';
import {
  NodeExecutionError,
  runWorkflow,
  WorkflowValidationError,
  type WorkflowObserver,
  type WorkflowProviders,
} from './workflow/engine.js';
import { createLangfuseObserver } from './workflow/langfuse.js';
import { createWorkflowProviders } from './workflow/providers/index.js';

type AuthRequest = Request & { userId?: string };

const anonymousDataFields: Record<FlowNode['type'], Set<string>> = {
  start: new Set(['message']),
  input: new Set(['variable', 'defaultValue']),
  message: new Set(['message']),
  question: new Set(['message', 'variable']),
  condition: new Set(['variable', 'condition']),
  action: new Set(['action', 'payload', 'outputVariable']),
  rag_search: new Set(['query', 'outputVariable', 'limit']),
  web_search: new Set(['query', 'outputVariable', 'limit']),
  llm: new Set(['model', 'systemPrompt', 'prompt', 'outputVariable']),
  output: new Set(['value']),
};

function isFlow(value: unknown): value is Flow {
  if (!value || typeof value !== 'object') return false;
  const flow = value as Flow;
  const allowedNodeTypes = new Set([
    'start',
    'input',
    'message',
    'question',
    'condition',
    'action',
    'rag_search',
    'web_search',
    'llm',
    'output',
  ]);
  return (
    Array.isArray(flow.nodes) &&
    Array.isArray(flow.edges) &&
    flow.nodes.every(
      (node) =>
        node &&
        typeof node.id === 'string' &&
        typeof node.label === 'string' &&
        allowedNodeTypes.has(node.type) &&
        node.data &&
        typeof node.data === 'object' &&
        Object.values(node.data).every((value) => typeof value === 'string') &&
        typeof node.position?.x === 'number' &&
        typeof node.position?.y === 'number',
    ) &&
    flow.edges.every(
      (edge) =>
        edge &&
        typeof edge.id === 'string' &&
        typeof edge.source === 'string' &&
        typeof edge.target === 'string',
    )
  );
}

function anonymousFlowIssue(
  flow: Flow,
  limits: { maxBytes: number; maxNodes: number; maxEdges: number },
) {
  if (Buffer.byteLength(JSON.stringify(flow), 'utf8') > limits.maxBytes)
    return `Anonymous flow exceeds the ${limits.maxBytes} byte limit.`;
  if (flow.nodes.length > limits.maxNodes)
    return `Anonymous flow exceeds the ${limits.maxNodes} node limit.`;
  if (flow.edges.length > limits.maxEdges)
    return `Anonymous flow exceeds the ${limits.maxEdges} edge limit.`;

  const allowedModels = new Set(
    (process.env.ANONYMOUS_ALLOWED_MODELS || process.env.OPENAI_MODEL || 'gpt-4o-mini')
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean),
  );
  for (const node of flow.nodes) {
    const unexpectedNodeField = Object.keys(node).find(
      (field) => !['id', 'type', 'label', 'position', 'data'].includes(field),
    );
    if (unexpectedNodeField)
      return `Field ${unexpectedNodeField} is not allowed on anonymous nodes.`;
    const unexpectedPositionField = Object.keys(node.position).find(
      (field) => field !== 'x' && field !== 'y',
    );
    if (unexpectedPositionField)
      return `Field ${unexpectedPositionField} is not allowed in anonymous node positions.`;
    const allowedFields = anonymousDataFields[node.type];
    const unexpectedField = Object.keys(node.data).find((field) => !allowedFields.has(field));
    if (unexpectedField)
      return `Field ${unexpectedField} is not allowed on anonymous ${node.type} nodes.`;
    if (node.type === 'llm' && node.data.model && !allowedModels.has(node.data.model))
      return `Model ${node.data.model} is not allowed for anonymous runs.`;
  }
  for (const edge of flow.edges) {
    const unexpectedEdgeField = Object.keys(edge).find(
      (field) => !['id', 'source', 'target', 'label'].includes(field),
    );
    if (unexpectedEdgeField)
      return `Field ${unexpectedEdgeField} is not allowed on anonymous edges.`;
  }
  return null;
}

function createAnonymousRateLimiter(limit: number, windowMs: number) {
  const clients = new Map<string, { count: number; resetAt: number }>();
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const current = clients.get(key);
    const entry =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    if (entry.count >= limit) {
      response.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1_000)));
      return response.status(429).json({
        code: 'ANONYMOUS_RATE_LIMITED',
        message: 'Too many anonymous workflow runs. Please try again later.',
      });
    }
    entry.count += 1;
    clients.set(key, entry);
    if (clients.size > 10_000) {
      for (const [client, value] of clients) if (value.resetAt <= now) clients.delete(client);
    }
    next();
  };
}

function flowFromBody(body: unknown): Flow | null {
  if (isFlow(body)) return body;
  if (body && typeof body === 'object') {
    const candidate = body as { nodes?: unknown; edges?: unknown };
    const flow = { nodes: candidate.nodes, edges: candidate.edges };
    if (isFlow(flow)) return flow;
  }
  return null;
}

function flowName(body: unknown, fallback = 'Untitled flow') {
  if (!body || typeof body !== 'object') return fallback;
  const value = String((body as { name?: unknown }).name || '').trim();
  return value.slice(0, 100) || fallback;
}

export function createApp(
  options: {
    providers?: WorkflowProviders;
    observerFactory?: () => WorkflowObserver;
    store?: FlowStore;
    anonymousRateLimit?: { limit: number; windowMs: number };
  } = {},
) {
  const app = express();
  const jwtSecret = process.env.JWT_SECRET || 'development-only-change-me';
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClient = new OAuth2Client(googleClientId);
  const publicUser = ({ id, email, name }: UserRecord) => ({ id, email, name });
  const issueToken = (user: UserRecord) =>
    jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '7d' });
  const providers = options.providers || createWorkflowProviders();
  const observerFactory = options.observerFactory || createLangfuseObserver;
  const store = options.store || createPostgresStore();
  const {
    createFlow,
    createUser,
    deleteFlow,
    findUserByEmail,
    findUserByGoogleSubject,
    getFlow,
    linkGoogle,
    listFlows,
    updateFlow,
  } = store;
  const anonymousLimits = {
    maxBytes: Number(process.env.ANONYMOUS_FLOW_MAX_BYTES) || 100_000,
    maxNodes: Number(process.env.ANONYMOUS_FLOW_MAX_NODES) || 50,
    maxEdges: Number(process.env.ANONYMOUS_FLOW_MAX_EDGES) || 100,
  };
  const anonymousRateLimit = options.anonymousRateLimit || {
    limit: Number(process.env.ANONYMOUS_RUN_LIMIT) || 10,
    windowMs: Number(process.env.ANONYMOUS_RUN_WINDOW_MS) || 60_000,
  };

  function authenticate(request: AuthRequest, response: Response, next: NextFunction) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    try {
      const payload = jwt.verify(token || '', jwtSecret) as jwt.JwtPayload;
      request.userId = String(payload.sub);
      next();
    } catch {
      response.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }
  }

  app.set('trust proxy', 1);
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', async (_request, response, next) => {
    try {
      await store.healthCheck();
      response.json({ ok: true, database: 'postgresql' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/register', async (request, response, next) => {
    try {
      const email = String(request.body.email || '')
        .trim()
        .toLowerCase();
      const password = String(request.body.password || '');
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
        return response
          .status(400)
          .json({ message: 'Email không hợp lệ hoặc mật khẩu chưa đủ 8 ký tự.' });
      }
      if (await findUserByEmail(email))
        return response.status(409).json({ message: 'Email này đã được đăng ký.' });
      const user = await createUser({
        id: crypto.randomUUID(),
        email,
        passwordHash: await bcrypt.hash(password, 12),
        createdAt: new Date().toISOString(),
      });
      response.status(201).json({ token: issueToken(user), user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/login', async (request, response, next) => {
    try {
      const email = String(request.body.email || '')
        .trim()
        .toLowerCase();
      const password = String(request.body.password || '');
      const user = await findUserByEmail(email);
      if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        return response.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
      }
      response.json({ token: issueToken(user), user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/auth/google', async (request, response, next) => {
    try {
      if (!googleClientId)
        return response.status(503).json({ message: 'Google Sign-In chưa được cấu hình.' });
      const ticket = await googleClient.verifyIdToken({
        idToken: String(request.body.credential || ''),
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified)
        return response.status(401).json({ message: 'Tài khoản Google không hợp lệ.' });
      const email = payload.email.toLowerCase();
      let user = await findUserByGoogleSubject(payload.sub);
      if (!user) {
        user = await findUserByEmail(email);
        if (user) await linkGoogle(user.id, payload.sub, payload.name);
        else
          user = await createUser({
            id: crypto.randomUUID(),
            email,
            name: payload.name,
            googleSubject: payload.sub,
            createdAt: new Date().toISOString(),
          });
      }
      response.json({ token: issueToken(user), user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/flows', authenticate, async (request: AuthRequest, response, next) => {
    try {
      response.json({ flows: await listFlows(request.userId!) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/flows', authenticate, async (request: AuthRequest, response, next) => {
    try {
      const flow = flowFromBody(request.body);
      if (!flow)
        return response.status(400).json({ message: 'Flow không đúng schema nodes/edges.' });
      const now = new Date().toISOString();
      const record: FlowRecord = {
        ...flow,
        id: crypto.randomUUID(),
        ownerId: request.userId!,
        name: flowName(request.body),
        createdAt: now,
        updatedAt: now,
      };
      await createFlow(record);
      response.status(201).json({ flow: record });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/flows/:flowId', authenticate, async (request: AuthRequest, response, next) => {
    try {
      const flow = await getFlow(request.userId!, String(request.params.flowId));
      if (!flow) return response.status(404).json({ message: 'Không tìm thấy flow.' });
      response.json({ flow });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/flows/:flowId', authenticate, async (request: AuthRequest, response, next) => {
    try {
      const flow = flowFromBody(request.body);
      if (!flow)
        return response.status(400).json({ message: 'Flow không đúng schema nodes/edges.' });
      const updated = await updateFlow(
        request.userId!,
        String(request.params.flowId),
        flow,
        flowName(request.body, ''),
      );
      if (!updated) return response.status(404).json({ message: 'Không tìm thấy flow.' });
      response.json({ flow: updated });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/flows/:flowId', authenticate, async (request: AuthRequest, response, next) => {
    try {
      if (!(await deleteFlow(request.userId!, String(request.params.flowId))))
        return response.status(404).json({ message: 'Không tìm thấy flow.' });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/flows/:flowId/runs',
    authenticate,
    async (request: AuthRequest, response, next) => {
      try {
        const flow = await getFlow(request.userId!, String(request.params.flowId));
        if (!flow) return response.status(404).json({ message: 'Không tìm thấy flow.' });
        const result = await runWorkflow({
          flowId: flow.id,
          userId: request.userId!,
          flow,
          input: request.body?.input,
          variables: request.body?.variables,
          providers,
          observer: observerFactory(),
        });
        response.json({ run: result });
      } catch (error) {
        if (error instanceof WorkflowValidationError)
          return response
            .status(400)
            .json({ code: 'INVALID_WORKFLOW', message: error.message, issues: error.issues });
        if (error instanceof NodeExecutionError)
          return response
            .status(422)
            .json({ code: error.code, nodeId: error.nodeId, message: error.message });
        next(error);
      }
    },
  );

  app.post(
    '/api/runs/anonymous',
    createAnonymousRateLimiter(anonymousRateLimit.limit, anonymousRateLimit.windowMs),
    async (request, response, next) => {
      try {
        if (!request.body || typeof request.body !== 'object')
          return response.status(400).json({ message: 'Anonymous run body is invalid.' });
        const body = request.body as Record<string, unknown>;
        const unexpectedField = Object.keys(body).find(
          (field) => field !== 'flow' && field !== 'input',
        );
        if (unexpectedField)
          return response.status(400).json({
            code: 'UNSAFE_ANONYMOUS_INPUT',
            message: `Field ${unexpectedField} is not accepted for anonymous runs.`,
          });
        if (typeof body.input !== 'string' || body.input.length > 10_000)
          return response
            .status(400)
            .json({ message: 'Anonymous input must be at most 10000 characters.' });
        if (
          !body.flow ||
          typeof body.flow !== 'object' ||
          Object.keys(body.flow).some((field) => field !== 'nodes' && field !== 'edges')
        )
          return response.status(400).json({
            code: 'UNSAFE_ANONYMOUS_FLOW',
            message: 'Anonymous flow only accepts nodes and edges.',
          });
        const flow = flowFromBody(body.flow);
        if (!flow)
          return response
            .status(400)
            .json({ message: 'Flow does not match the nodes/edges schema.' });
        const issue = anonymousFlowIssue(flow, anonymousLimits);
        if (issue)
          return response.status(400).json({ code: 'UNSAFE_ANONYMOUS_FLOW', message: issue });

        const sessionId = crypto.randomUUID();
        const result = await runWorkflow({
          flowId: 'anonymous-flow',
          userId: `anonymous:${sessionId}`,
          flow,
          input: body.input,
          providers,
          observer: observerFactory(),
        });
        response.json({ run: result });
      } catch (error) {
        if (error instanceof WorkflowValidationError)
          return response
            .status(400)
            .json({ code: 'INVALID_WORKFLOW', message: error.message, issues: error.issues });
        if (error instanceof NodeExecutionError)
          return response
            .status(422)
            .json({ code: error.code, nodeId: error.nodeId, message: error.message });
        next(error);
      }
    },
  );

  // Compatibility aliases for existing clients: operate on the owner's most recent flow.
  app.get('/api/flow', authenticate, async (request: AuthRequest, response, next) => {
    try {
      response.json({ flow: (await listFlows(request.userId!))[0] ?? null });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/flow', authenticate, async (request: AuthRequest, response, next) => {
    try {
      const flow = flowFromBody(request.body);
      if (!flow)
        return response.status(400).json({ message: 'Flow không đúng schema nodes/edges.' });
      const current = (await listFlows(request.userId!))[0];
      if (current) await updateFlow(request.userId!, current.id, flow);
      else {
        const now = new Date().toISOString();
        await createFlow({
          ...flow,
          id: crypto.randomUUID(),
          ownerId: request.userId!,
          name: 'Default flow',
          createdAt: now,
          updatedAt: now,
        });
      }
      response.json({ saved: true });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
    void next;
    console.error(error instanceof Error ? error.message : 'Unknown server error');
    response.status(500).json({ message: 'Máy chủ gặp lỗi. Vui lòng thử lại.' });
  });

  return app;
}
