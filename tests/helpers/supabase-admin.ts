import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encrypt, hashSecret } from '../../src/lib/encryption';

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local for E2E tests'
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export async function deleteUserByEmail(email: string): Promise<void> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (data?.id) {
    await admin.auth.admin.deleteUser(data.id);
  }
}

export async function getProfileByEmail(email: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name, role, status')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return data;
}

export async function getProfileIdByEmail(email: string): Promise<string> {
  const p = await getProfileByEmail(email);
  if (!p?.id) throw new Error(`No profile found for ${email}`);
  return p.id;
}

// ------------------------------------------------------------------
// Companies
// ------------------------------------------------------------------

export async function createCompany(opts: { name: string; note?: string | null }): Promise<{ id: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('companies')
    .insert({ name: opts.name, note: opts.note ?? null })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createCompany failed: ${error?.message ?? 'no data'}`);
  return { id: data.id as string };
}

export async function deleteCompany(id: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('companies').delete().eq('id', id);
  if (error) throw new Error(`deleteCompany failed: ${error.message}`);
}

export async function countCompanies(): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin.from('companies').select('*', { count: 'exact', head: true });
  if (error) throw new Error(`countCompanies failed: ${error.message}`);
  return count ?? 0;
}

// ------------------------------------------------------------------
// user_companies (assignment)
// ------------------------------------------------------------------

export async function assignUserToCompany(
  userId: string,
  companyId: string,
  assignedBy?: string
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('user_companies')
    .upsert(
      { user_id: userId, company_id: companyId, assigned_by: assignedBy ?? null },
      { onConflict: 'user_id,company_id' }
    );
  if (error) throw new Error(`assignUserToCompany failed: ${error.message}`);
}

export async function unassignUserFromCompany(userId: string, companyId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId);
  if (error) throw new Error(`unassignUserFromCompany failed: ${error.message}`);
}

// ------------------------------------------------------------------
// Workflows
// ------------------------------------------------------------------

export async function createWorkflow(opts: {
  companyId: string;
  name: string;
  type?: 'chat' | 'trigger';
  webhookUrl?: string;
  hasKnowledgeBase?: boolean;
  isActive?: boolean;
  createdBy?: string;
  /** If provided, this plaintext token is hashed + encrypted; otherwise a random UUID is used. */
  token?: string;
}): Promise<{ id: string; rawToken: string }> {
  const admin = getAdminClient();
  const rawToken = opts.token ?? crypto.randomUUID();
  const { data, error } = await admin
    .from('workflows')
    .insert({
      company_id: opts.companyId,
      name: opts.name,
      type: opts.type ?? 'chat',
      webhook_url: opts.webhookUrl ?? 'https://n8n.example.com/webhook/test',
      has_knowledge_base: opts.hasKnowledgeBase ?? false,
      is_active: opts.isActive ?? true,
      config: { params: [] },
      created_by: opts.createdBy ?? null,
      token_hash: hashSecret(rawToken),
      token_encrypted: encrypt(rawToken),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createWorkflow failed: ${error?.message ?? 'no data'}`);
  return { id: data.id as string, rawToken };
}

export async function deleteWorkflow(id: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('workflows').delete().eq('id', id);
  if (error) throw new Error(`deleteWorkflow failed: ${error.message}`);
}

export async function setWorkflowActive(id: string, isActive: boolean): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('workflows').update({ is_active: isActive }).eq('id', id);
  if (error) throw new Error(`setWorkflowActive failed: ${error.message}`);
}

export async function getWorkflowById(id: string) {
  const admin = getAdminClient();
  const { data } = await admin.from('workflows').select('id, name, company_id, is_active').eq('id', id).maybeSingle();
  return data;
}

// ------------------------------------------------------------------
// Template library
// ------------------------------------------------------------------

export async function createTemplate(opts: {
  title: string;
  description?: string | null;
  setupGuide?: string | null;
  workflowJson?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('template_library')
    .insert({
      title: opts.title,
      description: opts.description ?? null,
      setup_guide: opts.setupGuide ?? null,
      workflow_json: opts.workflowJson ?? { nodes: [], connections: {} },
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`createTemplate failed: ${error?.message ?? 'no data'}`);
  return { id: data.id as string };
}

export async function deleteTemplate(id: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('template_library').delete().eq('id', id);
  if (error) throw new Error(`deleteTemplate failed: ${error.message}`);
}

export async function getTemplateById(id: string) {
  const admin = getAdminClient();
  const { data } = await admin.from('template_library').select('id, title, description').eq('id', id).maybeSingle();
  return data;
}

// ------------------------------------------------------------------
// Documents
// ------------------------------------------------------------------

export async function insertDocument(opts: {
  workflowId: string;
  uploadedBy: string;
  name?: string;
  fileType?: 'pdf' | 'txt' | 'docx' | 'md';
  storagePath?: string;
  status?: 'pending' | 'processing' | 'ready' | 'error';
}): Promise<{ id: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('documents')
    .insert({
      workflow_id: opts.workflowId,
      uploaded_by: opts.uploadedBy,
      name: opts.name ?? 'test-doc.txt',
      file_type: opts.fileType ?? 'txt',
      storage_path: opts.storagePath ?? `test/${crypto.randomUUID()}.txt`,
      status: opts.status ?? 'ready',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`insertDocument failed: ${error?.message ?? 'no data'}`);
  return { id: data.id as string };
}

export async function deleteDocument(id: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('documents').delete().eq('id', id);
  if (error) throw new Error(`deleteDocument failed: ${error.message}`);
}

// ------------------------------------------------------------------
// Chat / trigger logs
// ------------------------------------------------------------------

export async function insertChatLog(opts: {
  workflowId: string;
  sessionId?: string;
  humanMessage?: string;
  aiResponse?: string;
}): Promise<{ id: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('chat_logs')
    .insert({
      workflow_id: opts.workflowId,
      session_id: opts.sessionId ?? `e2e-session-${crypto.randomUUID()}`,
      human_message: opts.humanMessage ?? 'e2e human message',
      ai_response: opts.aiResponse ?? 'e2e ai response',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`insertChatLog failed: ${error?.message ?? 'no data'}`);
  return { id: data.id as string };
}

export async function insertTriggerLog(opts: {
  workflowId: string;
  userId: string;
  status?: 'success' | 'error';
  durationMs?: number;
}): Promise<{ id: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('trigger_logs')
    .insert({
      workflow_id: opts.workflowId,
      user_id: opts.userId,
      status: opts.status ?? 'success',
      duration_ms: opts.durationMs ?? 100,
      request_params: {},
      response_data: {},
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`insertTriggerLog failed: ${error?.message ?? 'no data'}`);
  return { id: data.id as string };
}
