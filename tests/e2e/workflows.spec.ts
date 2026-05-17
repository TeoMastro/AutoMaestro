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
} from '../helpers/supabase-admin';

const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Two-company fixture: companyA (manager + client are assigned), companyB (neither).
// One workflow in each. Asserts role visibility + cross-company access blocks.
test.describe('Workflows — role-scoped visibility', () => {
  let companyAId: string;
  let companyBId: string;
  let workflowAId: string;
  let workflowBId: string;
  let workflowAName: string;
  let workflowBName: string;
  let managerId: string;
  let clientId: string;

  test.beforeAll(async () => {
    managerId = await getProfileIdByEmail(ROLES.manager.email);
    clientId = await getProfileIdByEmail(ROLES.client.email);

    ({ id: companyAId } = await createCompany({ name: uniqueName('e2e-wf-coA') }));
    ({ id: companyBId } = await createCompany({ name: uniqueName('e2e-wf-coB') }));

    await assignUserToCompany(managerId, companyAId);
    await assignUserToCompany(clientId, companyAId);

    workflowAName = uniqueName('e2e-wf-A');
    workflowBName = uniqueName('e2e-wf-B');
    ({ id: workflowAId } = await createWorkflow({ companyId: companyAId, name: workflowAName, type: 'chat' }));
    ({ id: workflowBId } = await createWorkflow({ companyId: companyBId, name: workflowBName, type: 'chat' }));
  });

  test.afterAll(async () => {
    await deleteWorkflow(workflowAId).catch(() => {});
    await deleteWorkflow(workflowBId).catch(() => {});
    await unassignUserFromCompany(managerId, companyAId).catch(() => {});
    await unassignUserFromCompany(clientId, companyAId).catch(() => {});
    await deleteCompany(companyAId).catch(() => {});
    await deleteCompany(companyBId).catch(() => {});
  });

  test('admin sees both workflows on /manage/workflows', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.admin.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/workflows');
    // Search to narrow the table since dev fixtures may add other rows.
    await page.getByPlaceholder(/search/i).first().fill('e2e-wf-');
    await expect(page.getByRole('cell', { name: workflowAName })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('cell', { name: workflowBName })).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test('manager sees only the workflow in their assigned company', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/workflows');
    await page.getByPlaceholder(/search/i).first().fill('e2e-wf-');
    await expect(page.getByRole('cell', { name: workflowAName })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('cell', { name: workflowBName })).toHaveCount(0);
    await ctx.close();
  });

  test('client visiting /manage/workflows is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/workflows');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });

  test('client at /workflow sees the assigned-company workflow, not the unassigned one', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/workflow');
    // workflowA is in companyA (client assigned). The page might show a single workflow or a selector.
    // Either way, the workflowA name should be present somewhere and workflowB should not.
    await expect(page.getByText(workflowAName).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(workflowBName)).toHaveCount(0);
    await ctx.close();
  });
});

// Direct API attack surface for the trigger route.
test.describe('Workflows — /api/workflows/trigger hack attempts', () => {
  let companyId: string;
  let unassignedWorkflowId: string;

  test.beforeAll(async () => {
    // Workflow in a company NOT assigned to anyone in ROLES — so client/manager attempting
    // to trigger it must be rejected. Use type=trigger to match the route's intent.
    ({ id: companyId } = await createCompany({ name: uniqueName('e2e-wf-attack-co') }));
    ({ id: unassignedWorkflowId } = await createWorkflow({
      companyId,
      name: uniqueName('e2e-wf-attack'),
      type: 'trigger',
    }));
  });

  test.afterAll(async () => {
    await deleteWorkflow(unassignedWorkflowId).catch(() => {});
    await deleteCompany(companyId).catch(() => {});
  });

  test('anonymous POST to /api/workflows/trigger returns 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.post('/api/workflows/trigger', {
      data: { workflowId: unassignedWorkflowId, params: {} },
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('client POSTing /api/workflows/trigger with an unassigned workflowId returns 404', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.client.storageState });
    const res = await ctx.post('/api/workflows/trigger', {
      data: { workflowId: unassignedWorkflowId, params: {} },
    });
    // Route returns 404 because the SELECT (RLS-scoped) finds nothing.
    expect(res.status()).toBe(404);
    await ctx.dispose();
  });

  test('client POSTing /api/workflows/trigger without workflowId returns 400', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.client.storageState });
    const res = await ctx.post('/api/workflows/trigger', { data: { params: {} } });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test('client POSTing /api/workflows/trigger with a non-UUID workflowId is rejected', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.client.storageState });
    const res = await ctx.post('/api/workflows/trigger', {
      data: { workflowId: "'; DROP TABLE workflows;--", params: {} },
    });
    // Bad UUID → SELECT fails → route returns 404 (not 500).
    expect([400, 404]).toContain(res.status());
    await ctx.dispose();
  });
});
