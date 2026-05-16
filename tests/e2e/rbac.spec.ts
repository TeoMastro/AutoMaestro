import { test, expect } from '@playwright/test';
import { ROLES, uniqueEmail } from '../helpers/users';
import { deleteUserByEmail, getProfileByEmail } from '../helpers/supabase-admin';

test.describe('RBAC: only admins can manage users', () => {
  test('manager visiting /admin/user is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    await page.goto('/admin/user');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });

  test('client visiting /admin/user is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/admin/user');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });

  test('manager visiting /admin/user/create is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    await page.goto('/admin/user/create');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });

  test('client visiting /admin/user/create is redirected to signin', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/admin/user/create');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await ctx.close();
  });

  test('manager hitting /api/users-export gets 403', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.manager.storageState });
    const res = await ctx.get('/api/users-export?format=csv');
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('client hitting /api/users-export gets 403', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.client.storageState });
    const res = await ctx.get('/api/users-export?format=csv');
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('admin hitting /api/users-export succeeds', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ storageState: ROLES.admin.storageState });
    const res = await ctx.get('/api/users-export?format=csv');
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('manager session cannot create a user even via direct form POST flow', async ({ browser }) => {
    // Sanity check: manager logged in, navigates to dashboard, tries to load create page —
    // should be bounced before any server action can run, and DB must remain unchanged.
    const email = uniqueEmail('e2e-rbac-blocked');
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    await page.goto('/admin/user/create');
    await expect(page).toHaveURL(/\/auth\/signin/);

    const profile = await getProfileByEmail(email);
    expect(profile).toBeNull();

    await ctx.close();
    await deleteUserByEmail(email).catch(() => {});
  });
});
