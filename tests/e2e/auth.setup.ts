import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { ROLES, RoleKey } from '../helpers/users';

const authDir = path.resolve(__dirname, '..', '..', 'playwright', '.auth');
fs.mkdirSync(authDir, { recursive: true });

async function signInAndSave(page: import('@playwright/test').Page, role: RoleKey) {
  const { email, password, storageState } = ROLES[role];
  await page.goto('/auth/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: storageState });
}

setup('authenticate as admin', async ({ page }) => {
  await signInAndSave(page, 'admin');
});

setup('authenticate as manager', async ({ page }) => {
  await signInAndSave(page, 'manager');
});

setup('authenticate as client', async ({ page }) => {
  await signInAndSave(page, 'client');
});
