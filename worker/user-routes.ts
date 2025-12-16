import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ChatBoardEntity, TaskEntity, PaymentEntity, ComplianceLogEntity, TrainingModuleEntity, AiMessageEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { Task, Payment, ComplianceLog, TrainingModule, AiMessage, OutboxItem } from "@shared/types";
// Helper to dynamically get entity class
function getEntityClass(tableName: string) {
  switch (tableName) {
    case 'tasks': return TaskEntity;
    case 'payments': return PaymentEntity;
    case 'complianceLogs': return ComplianceLogEntity;
    case 'trainingModules': return TrainingModuleEntity;
    case 'aiMessages': return AiMessageEntity;
    default: return null;
  }
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));
  // USERS
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await UserEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/users', async (c) => {
    const { name } = (await c.req.json()) as { name?: string };
    if (!name?.trim()) return bad(c, 'name required');
    return ok(c, await UserEntity.create(c.env, { id: crypto.randomUUID(), name: name.trim() }));
  });
  // CHATS
  app.get('/api/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await ChatBoardEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/chats', async (c) => {
    const { title } = (await c.req.json()) as { title?: string };
    if (!title?.trim()) return bad(c, 'title required');
    const created = await ChatBoardEntity.create(c.env, { id: crypto.randomUUID(), title: title.trim(), messages: [] });
    return ok(c, { id: created.id, title: created.title });
  });
  // MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    const chat = new ChatBoardEntity(c.env, c.req.param('chatId'));
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.listMessages());
  });
  app.post('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    const { userId, text } = (await c.req.json()) as { userId?: string; text?: string };
    if (!isStr(userId) || !text?.trim()) return bad(c, 'userId and text required');
    const chat = new ChatBoardEntity(c.env, chatId);
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.sendMessage(userId, text.trim()));
  });
  // --- SuiteWaste OS CRUD Routes ---
  const entities = [
    { path: 'tasks', ctor: TaskEntity },
    { path: 'payments', ctor: PaymentEntity },
    { path: 'compliancelogs', ctor: ComplianceLogEntity },
    { path: 'trainingmodules', ctor: TrainingModuleEntity },
    { path: 'aimessages', ctor: AiMessageEntity },
  ];
  for (const { path, ctor } of entities) {
    // GET /api/{path}
    app.get(`/api/${path}`, async (c) => {
      await ctor.ensureSeed(c.env);
      const page = await ctor.list(c.env, c.req.query('cursor') ?? null, c.req.query('limit') ? Number(c.req.query('limit')) : undefined);
      return ok(c, page.items); // Return items directly for simplicity
    });
    // POST /api/{path}
    app.post(`/api/${path}`, async (c) => {
      const body = await c.req.json();
      if (!body.id) body.id = crypto.randomUUID();
      const item = await ctor.create(c.env, body);
      return ok(c, item);
    });
    // PATCH /api/{path}/:id
    app.patch(`/api/${path}/:id`, async (c) => {
      const id = c.req.param('id');
      const body = await c.req.json();
      const entity = new ctor(c.env, id);
      if (!await entity.exists()) return notFound(c);
      await entity.patch(body);
      return ok(c, await entity.getState());
    });
    // DELETE /api/{path}/:id
    app.delete(`/api/${path}/:id`, async (c) => {
      const id = c.req.param('id');
      const deleted = await ctor.delete(c.env, id);
      return ok(c, { id, deleted });
    });
  }
  // SYNC Endpoint
  app.post('/api/sync', async (c) => {
    const { items } = (await c.req.json()) as { items: OutboxItem[] };
    if (!Array.isArray(items)) return bad(c, 'Invalid payload: items must be an array.');
    let syncedCount = 0;
    for (const item of items) {
      const EntityClass = getEntityClass(item.table);
      if (!EntityClass) {
        console.warn(`[SYNC] Unknown table: ${item.table}`);
        continue;
      }
      try {
        switch (item.action) {
          case 'create':
            await EntityClass.create(c.env, item.payload);
            break;
          case 'update':
            const entityToUpdate = new EntityClass(c.env, item.payload.id);
            if (await entityToUpdate.exists()) {
              await entityToUpdate.patch(item.payload);
            } else {
              // If it doesn't exist, maybe it was deleted. Or create it.
              await EntityClass.create(c.env, item.payload);
            }
            break;
          case 'delete':
            await EntityClass.delete(c.env, item.payload.id);
            break;
        }
        syncedCount++;
      } catch (e) {
        console.error(`[SYNC] Failed to process item: ${item.id}`, e);
      }
    }
    return ok(c, { synced: syncedCount, total: items.length });
  });
  // DELETE: Users
  app.delete('/api/users/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await UserEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/users/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await UserEntity.deleteMany(c.env, list), ids: list });
  });
  // DELETE: Chats
  app.delete('/api/chats/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await ChatBoardEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/chats/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await ChatBoardEntity.deleteMany(c.env, list), ids: list });
  });
}