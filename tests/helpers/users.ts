export const ROLES = {
  admin: {
    email: 'admin@nextlaunchkit.com',
    password: 'demoadmin!1',
    role: 'ADMIN' as const,
    storageState: 'playwright/.auth/admin.json',
  },
  manager: {
    email: 'manager@nextlaunchkit.com',
    password: 'demomanager!1',
    role: 'MANAGER' as const,
    storageState: 'playwright/.auth/manager.json',
  },
  client: {
    email: 'user@nextlaunchkit.com',
    password: 'demouser!1',
    role: 'CLIENT' as const,
    storageState: 'playwright/.auth/client.json',
  },
} as const;

export type RoleKey = keyof typeof ROLES;

export function uniqueEmail(prefix = 'e2e-user'): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}@example.com`;
}
