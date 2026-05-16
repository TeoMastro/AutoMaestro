import { test, expect } from '@playwright/test';
import { ROLES } from '../helpers/users';

test.describe('Sign-in flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.getByLabel('Email').fill('admin@nextlaunchkit.com');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('protected routes redirect anonymous users to signin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe('Role-aware sidebar', () => {
  test('admin sees Users + Companies links', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.admin.storageState });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Companies' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Workflows' })).toBeVisible();
    await ctx.close();
  });

  test('manager sees Workflows + Templates but NOT Users or Companies', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.manager.storageState });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Workflows' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Template Library' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Companies' })).toHaveCount(0);
    await ctx.close();
  });

  test('client sees My Workflows but NOT Users, Companies, or Templates', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: ROLES.client.storageState });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'My Workflows' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Companies' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Template Library' })).toHaveCount(0);
    await ctx.close();
  });
});
