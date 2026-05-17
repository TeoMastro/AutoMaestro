import { test, expect } from '@playwright/test';
import { ROLES } from '../helpers/users';
import { createTemplate, deleteTemplate, getTemplateById } from '../helpers/supabase-admin';

const uniqueName = (prefix = 'e2e-tpl') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('Template Library — role access', () => {
  let templateId: string;
  let templateTitle: string;

  test.beforeAll(async () => {
    templateTitle = uniqueName('e2e-tpl-view');
    ({ id: templateId } = await createTemplate({ title: templateTitle, description: 'e2e seed' }));
  });

  test.afterAll(async () => {
    await deleteTemplate(templateId).catch(() => {});
  });

  test('admin sees the template and the Create button', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.admin.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/templates');
    await page.getByPlaceholder(/search/i).first().fill(templateTitle);
    await expect(page.getByRole('cell', { name: templateTitle })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible();
    await ctx.close();
  });

  test('manager sees the template but NOT the Create button (read-only)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/templates');
    await page.getByPlaceholder(/search/i).first().fill(templateTitle);
    await expect(page.getByRole('cell', { name: templateTitle })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toHaveCount(0);
    // Row should have a View (eye) button but no Edit/Delete.
    const row = page.getByRole('row', { name: new RegExp(templateTitle) });
    // 1 button (eye) for manager; 3 (eye + edit + delete) for admin.
    await expect(row.getByRole('button')).toHaveCount(1);
    await ctx.close();
  });

  test('client visiting /manage/templates is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/templates');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });
});

test.describe('Template Library — hack attempts', () => {
  test('manager hitting /manage/templates/create is blocked (404, no form)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    const res = await page.goto('/manage/templates/create');
    expect(res?.status()).toBe(404);
    // Form labels must not be present.
    await expect(page.getByLabel(/title/i)).toHaveCount(0);
    await ctx.close();
  });

  test('manager hitting /manage/templates/[id]/update on a real template is blocked (404, row unchanged)', async ({ browser }) => {
    const title = `e2e-tpl-mgr-block-${Date.now().toString(36)}`;
    const { id } = await createTemplate({ title, description: 'untouched' });
    try {
      const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
      const page = await ctx.newPage();
      const res = await page.goto(`/manage/templates/${id}/update`);
      expect(res?.status()).toBe(404);

      const row = await getTemplateById(id);
      expect(row?.description).toBe('untouched');
      await ctx.close();
    } finally {
      await deleteTemplate(id).catch(() => {});
    }
  });

  test('client hitting /manage/templates/create is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/templates/create');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });
});
