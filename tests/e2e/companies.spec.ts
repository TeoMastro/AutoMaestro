import { test, expect } from '@playwright/test';
import { ROLES } from '../helpers/users';
import {
  getAdminClient,
  createCompany,
  deleteCompany,
  countCompanies,
} from '../helpers/supabase-admin';

const uniqueName = (prefix = 'e2e-co') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('Companies — admin CRUD via UI', () => {
  test.use({ storageState: ROLES.admin.storageState });

  const created: string[] = [];

  test.afterAll(async () => {
    const admin = getAdminClient();
    for (const name of created) {
      const { data } = await admin.from('companies').select('id').eq('name', name);
      for (const row of data ?? []) {
        await deleteCompany(row.id).catch(() => {});
      }
    }
  });

  test('admin can create a company and DB row reflects it', async ({ page }) => {
    const name = uniqueName('e2e-co-create');
    created.push(name);

    await page.goto('/manage/companies/create');
    await page.getByLabel('Company Name').fill(name);
    await page.getByLabel('Note').fill('e2e note');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await page.waitForURL('**/manage/companies**', { timeout: 30_000 });
    await expect(page.getByText('Company created successfully')).toBeVisible();

    const admin = getAdminClient();
    const { data } = await admin.from('companies').select('id, name, note').eq('name', name).single();
    expect(data).not.toBeNull();
    expect(data?.name).toBe(name);
    expect(data?.note).toBe('e2e note');
  });

  test('admin can update a company and DB row reflects new values', async ({ page }) => {
    const name = uniqueName('e2e-co-update');
    created.push(name);
    const { id } = await createCompany({ name, note: 'before' });

    await page.goto(`/manage/companies/${id}/update`);
    const note = page.getByLabel('Note');
    await note.click();
    await note.press('ControlOrMeta+a');
    await note.fill('after');
    await page.getByRole('button', { name: 'Update', exact: true }).click();

    await page.waitForURL('**/manage/companies**', { timeout: 30_000 });
    await expect(page.getByText('Company updated successfully')).toBeVisible();

    const admin = getAdminClient();
    const { data } = await admin.from('companies').select('note').eq('id', id).single();
    expect(data?.note).toBe('after');
  });

  test('admin can delete a company and DB row is removed', async ({ page }) => {
    const name = uniqueName('e2e-co-delete');
    const { id } = await createCompany({ name });

    await page.goto('/manage/companies');
    await page.getByPlaceholder(/search companies/i).fill(name);
    await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 10_000 });

    const row = page.getByRole('row', { name: new RegExp(name) });
    await row.getByRole('button').last().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Company deleted successfully')).toBeVisible({ timeout: 15_000 });

    const admin = getAdminClient();
    const { data } = await admin.from('companies').select('id').eq('id', id).maybeSingle();
    expect(data).toBeNull();
  });
});

test.describe('Companies — role gating', () => {
  test('manager visiting /manage/companies is blocked (404, not the company table)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    const res = await page.goto('/manage/companies');
    // Page-level guard calls notFound() for non-admins; middleware allows /manage/* for managers.
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toHaveCount(0);
    await ctx.close();
  });

  test('manager visiting /manage/companies/create is blocked (404)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    const res = await page.goto('/manage/companies/create');
    expect(res?.status()).toBe(404);
    await expect(page.getByLabel('Company Name')).toHaveCount(0);
    await ctx.close();
  });

  test('client visiting /manage/companies is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/companies');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });

  test('client visiting /manage/companies/create is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/manage/companies/create');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });
});

test.describe('Companies — hack attempts', () => {
  test('manager cannot create a company: page rejected and DB count unchanged', async ({ browser }) => {
    const before = await countCompanies();

    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    const res = await page.goto('/manage/companies/create');
    expect(res?.status()).toBe(404);

    // Confirm no insert happened as a side effect of the request.
    const after = await countCompanies();
    expect(after).toBe(before);
    await ctx.close();
  });

  test('manager cannot view/update an existing company via /manage/companies/[id]/update (404)', async ({ browser }) => {
    const name = uniqueName('e2e-co-mgr-block');
    const { id } = await createCompany({ name, note: 'untouched' });
    try {
      const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
      const page = await ctx.newPage();
      const res = await page.goto(`/manage/companies/${id}/update`);
      expect(res?.status()).toBe(404);

      // DB row was not touched.
      const admin = getAdminClient();
      const { data } = await admin.from('companies').select('note').eq('id', id).single();
      expect(data?.note).toBe('untouched');
      await ctx.close();
    } finally {
      await deleteCompany(id).catch(() => {});
    }
  });

  test('hostile search payloads (quotes, wildcards, backslashes) do not crash the page', async ({ browser }) => {
    // Note: classic SQLi patterns like `' OR 1=1--` are blocked at the Cloudflare WAF in front of
    // Supabase, so they never reach buildOrIlikeFilter. Test what actually reaches the filter:
    // characters that buildOrIlikeFilter must escape (`"`, `\`) plus ilike wildcards (`%`, `_`).
    const payloads = ['"\\"', '\\\\', '"" OR ""=""', '%_%', '(()', '<script>x</script>'];
    const ctx = await browser.newContext({ storageState: ROLES.admin.storageState });
    const page = await ctx.newPage();
    try {
      for (const p of payloads) {
        const res = await page.goto(`/manage/companies?search=${encodeURIComponent(p)}`);
        expect(res?.status(), `payload ${JSON.stringify(p)} crashed the page`).toBeLessThan(400);
        await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible();
      }
    } finally {
      await ctx.close();
    }
  });
});
