import { test, expect } from '@playwright/test';
import { ROLES } from '../helpers/users';
import {
  getProfileIdByEmail,
  createCompany,
  deleteCompany,
  assignUserToCompany,
  unassignUserFromCompany,
  createWorkflow,
  deleteWorkflow,
  setWorkflowActive,
  insertDocument,
  deleteDocument,
  insertChatLog,
  insertTriggerLog,
} from '../helpers/supabase-admin';

const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Shared fixture: companyA (manager + client assigned) with workflowA, companyB unassigned with workflowB.
// workflowA has has_knowledge_base=true with a known plaintext token for Bearer tests.
// workflowB starts active, gets toggled off in one test then restored.
test.describe('Documents IDOR + history scoping + Bearer endpoints', () => {
  let adminId: string;
  let clientId: string;
  let managerId: string;
  let companyAId: string;
  let companyBId: string;
  let workflowAId: string;
  let workflowBId: string;
  let workflowARawToken: string;
  let workflowBRawToken: string;
  let adminDocId: string;
  let workflowAName: string;
  let workflowBName: string;

  test.beforeAll(async () => {
    adminId = await getProfileIdByEmail(ROLES.admin.email);
    managerId = await getProfileIdByEmail(ROLES.manager.email);
    clientId = await getProfileIdByEmail(ROLES.client.email);

    ({ id: companyAId } = await createCompany({ name: uniqueName('e2e-doc-coA') }));
    ({ id: companyBId } = await createCompany({ name: uniqueName('e2e-doc-coB') }));

    await assignUserToCompany(managerId, companyAId);
    await assignUserToCompany(clientId, companyAId);

    workflowAName = uniqueName('e2e-doc-wfA');
    workflowBName = uniqueName('e2e-doc-wfB');

    // workflowA: type=chat with KB on, in companyA (assigned)
    const wfA = await createWorkflow({
      companyId: companyAId,
      name: workflowAName,
      type: 'chat',
      hasKnowledgeBase: true,
    });
    workflowAId = wfA.id;
    workflowARawToken = wfA.rawToken;

    // workflowB: type=chat with KB OFF, in companyB (NOT assigned). Active by default.
    const wfB = await createWorkflow({
      companyId: companyBId,
      name: workflowBName,
      type: 'chat',
      hasKnowledgeBase: false,
    });
    workflowBId = wfB.id;
    workflowBRawToken = wfB.rawToken;

    // Admin-owned document on workflowA (used for IDOR test).
    ({ id: adminDocId } = await insertDocument({
      workflowId: workflowAId,
      uploadedBy: adminId,
      name: 'admin-secret.txt',
    }));

    // Seed logs on both workflows for history-scoping assertions.
    await insertChatLog({ workflowId: workflowAId, humanMessage: 'visible-to-A' });
    await insertChatLog({ workflowId: workflowBId, humanMessage: 'visible-to-B-only' });
    await insertTriggerLog({ workflowId: workflowAId, userId: adminId });
    await insertTriggerLog({ workflowId: workflowBId, userId: adminId });
  });

  test.afterAll(async () => {
    await deleteDocument(adminDocId).catch(() => {});
    await deleteWorkflow(workflowAId).catch(() => {});
    await deleteWorkflow(workflowBId).catch(() => {});
    await unassignUserFromCompany(managerId, companyAId).catch(() => {});
    await unassignUserFromCompany(clientId, companyAId).catch(() => {});
    await deleteCompany(companyAId).catch(() => {});
    await deleteCompany(companyBId).catch(() => {});
  });

  // ----------------------------------------------------------------
  // /api/documents/status — IDOR
  // ----------------------------------------------------------------

  test('admin GET /api/documents/status?id=<own-doc> returns 200', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.admin.storageState });
    const res = await ctx.get(`/api/documents/status?id=${adminDocId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(adminDocId);
    await ctx.dispose();
  });

  test('client GET /api/documents/status?id=<admin-doc> returns 403 (IDOR blocked)', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.client.storageState });
    const res = await ctx.get(`/api/documents/status?id=${adminDocId}`);
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('anonymous GET /api/documents/status?id=<admin-doc> returns 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.get(`/api/documents/status?id=${adminDocId}`);
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('client GET /api/documents/status without id returns 400', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.client.storageState });
    const res = await ctx.get(`/api/documents/status`);
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  // ----------------------------------------------------------------
  // History page scoping (server-rendered, scoped by RLS / session)
  // ----------------------------------------------------------------

  test('manager at /chat-history sees companyA workflow logs, not companyB', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    await page.goto('/chat-history');
    await expect(page.getByText(workflowAName).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(workflowBName)).toHaveCount(0);
    await ctx.close();
  });

  test('client at /trigger-history sees only own-company logs', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/trigger-history');
    await expect(page.getByText(workflowAName).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(workflowBName)).toHaveCount(0);
    await ctx.close();
  });

  // ----------------------------------------------------------------
  // Bearer-token endpoints: /api/logs/chat and /api/knowledge-search
  // ----------------------------------------------------------------

  test('/api/logs/chat with no Authorization header → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.post('/api/logs/chat', {
      data: { session_id: 'x', human_message: 'hi', ai_response: 'hello' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toMatch(/missing token/i);
    await ctx.dispose();
  });

  test('/api/logs/chat with wrong Bearer token → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.post('/api/logs/chat', {
      headers: { Authorization: 'Bearer not-a-real-token' },
      data: { session_id: 'x', human_message: 'hi', ai_response: 'hello' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toMatch(/invalid token/i);
    await ctx.dispose();
  });

  test('/api/logs/chat with valid token but inactive workflow → 403', async ({ playwright }) => {
    await setWorkflowActive(workflowBId, false);
    try {
      const ctx = await playwright.request.newContext();
      const res = await ctx.post('/api/logs/chat', {
        headers: { Authorization: `Bearer ${workflowBRawToken}` },
        data: { session_id: 'x', human_message: 'hi', ai_response: 'hello' },
      });
      expect(res.status()).toBe(403);
      expect((await res.json()).error).toMatch(/inactive/i);
      await ctx.dispose();
    } finally {
      await setWorkflowActive(workflowBId, true);
    }
  });

  test('/api/logs/chat with valid token but malformed JSON body → 400', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.post('/api/logs/chat', {
      headers: { Authorization: `Bearer ${workflowARawToken}`, 'Content-Type': 'application/json' },
      data: 'not-json' as unknown as Record<string, unknown>,
    });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test('/api/logs/chat with valid token but missing session_id → 400', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.post('/api/logs/chat', {
      headers: { Authorization: `Bearer ${workflowARawToken}` },
      data: { human_message: 'hi', ai_response: 'hello' },
    });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test('GET /api/logs/chat returns 405 (POST-only handler)', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.get('/api/logs/chat');
    expect(res.status()).toBe(405);
    await ctx.dispose();
  });

  test('/api/knowledge-search with valid token but workflow has no KB → 400', async ({ playwright }) => {
    // workflowB has has_knowledge_base=false
    const ctx = await playwright.request.newContext();
    const res = await ctx.post('/api/knowledge-search', {
      headers: { Authorization: `Bearer ${workflowBRawToken}` },
      data: { query: 'anything' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/no knowledge base/i);
    await ctx.dispose();
  });

  test('/api/knowledge-search with no token → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.post('/api/knowledge-search', { data: { query: 'anything' } });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });
});
