import { spawn } from 'child_process';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { ROLES } from './helpers/users';

loadEnv({ path: path.resolve(__dirname, '..', '.env.test.local') });

export default async function globalSetup() {
  console.log('[e2e] Re-seeding test database via npm run db:seed:test...');
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('npm', ['run', 'db:seed:test'], {
      stdio: 'inherit',
      shell: true,
    });
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`db:seed exited with code ${code}`));
    });
    proc.on('error', reject);
  });
  console.log('[e2e] Seed complete.');

  // Reset demo passwords so tests have known credentials even if
  // the auth.users row pre-existed (createUser is a no-op then).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const role of Object.values(ROLES)) {
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('email', role.email.toLowerCase())
      .maybeSingle();
    if (!data?.id) continue;
    const { error } = await admin.auth.admin.updateUserById(data.id, {
      password: role.password,
    });
    if (error) {
      throw new Error(`Failed to reset password for ${role.email}: ${error.message}`);
    }
  }
  console.log('[e2e] Demo passwords reset.');
}
