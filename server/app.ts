import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import {
  createFlow,
  createUser,
  deleteFlow,
  findUserByEmail,
  findUserByGoogleSubject,
  getFlow,
  linkGoogle,
  listFlows,
  updateFlow,
} from './store.js';
import type { Flow, FlowRecord, UserRecord } from './types.js';
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
  options: { providers?: WorkflowProviders; observerFactory?: () => WorkflowObserver } = {},
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

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (_request, response) => response.json({ ok: true }));

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
