import { test, expect } from '@playwright/test';
import { ROLES, uniqueEmail } from '../helpers/users';
import { deleteUserByEmail, getProfileByEmail } from '../helpers/supabase-admin';

test.use({ storageState: ROLES.admin.storageState });

test.describe('Admin User CRUD', () => {
  const created: string[] = [];

  test.afterAll(async () => {
    for (const email of created) {
      await deleteUserByEmail(email).catch(() => {});
    }
  });

  test('admin can create a CLIENT user and DB row reflects it', async ({ page }) => {
    const email = uniqueEmail('e2e-create');
    created.push(email);

    await page.goto('/admin/user/create');
    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('Created');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('TestPass!1');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await page.waitForURL('**/admin/user**', { timeout: 30_000 });
    await expect(page.getByText('User created successfully')).toBeVisible();

    const profile = await getProfileByEmail(email);
    expect(profile).not.toBeNull();
    expect(profile?.role).toBe('CLIENT');
    expect(profile?.status).toBe('ACTIVE');
    expect(profile?.first_name).toBe('E2E');
  });

  test('admin can update a user and DB row reflects new values', async ({ page }) => {
    const email = uniqueEmail('e2e-update');
    created.push(email);

    // Create via UI first
    await page.goto('/admin/user/create');
    await page.getByLabel('First Name').fill('Before');
    await page.getByLabel('Last Name').fill('Update');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('TestPass!1');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL('**/admin/user**', { timeout: 30_000 });
    await expect(page.getByText('User created successfully')).toBeVisible();

    const created_profile = await getProfileByEmail(email);
    expect(created_profile).not.toBeNull();

    // Edit via update page
    await page.goto(`/admin/user/${created_profile!.id}/update`);
    await page.getByLabel('First Name').fill('After');
    await page.getByRole('button', { name: 'Update', exact: true }).click();

    await page.waitForURL('**/admin/user**', { timeout: 30_000 });
    await expect(page.getByText('User updated successfully')).toBeVisible();

    const updated = await getProfileByEmail(email);
    expect(updated?.first_name).toBe('After');
  });

  test('admin can delete a user and the DB row is removed', async ({ page }) => {
    const email = uniqueEmail('e2e-delete');

    // Create via UI
    await page.goto('/admin/user/create');
    await page.getByLabel('First Name').fill('To');
    await page.getByLabel('Last Name').fill('Delete');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('TestPass!1');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.waitForURL('**/admin/user**', { timeout: 30_000 });
    await expect(page.getByText('User created successfully')).toBeVisible();

    const before = await getProfileByEmail(email);
    expect(before).not.toBeNull();

    // Search to narrow the table to a single row
    await page.getByPlaceholder('Search users...').fill(email);
    await expect(page.getByRole('cell', { name: email })).toBeVisible({ timeout: 10_000 });

    // Click the destructive (delete) icon button on that row
    const row = page.getByRole('row', { name: new RegExp(email) });
    await row.getByRole('button').last().click();

    // Confirm deletion in the dialog
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('User deleted successfully')).toBeVisible({ timeout: 15_000 });

    const after = await getProfileByEmail(email);
    expect(after).toBeNull();
  });
});
