'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkAdminAuth, checkAdminOrManagerAuth } from '@/lib/auth-helpers';
import { createTemplateLibrarySchema, updateTemplateLibrarySchema, formatZodErrors } from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildOrIlikeFilter } from '@/lib/supabase/search';
import type {
  TemplateLibraryItem,
  TemplateLibraryFormState,
  GetTemplateLibraryParams,
  GetTemplateLibraryResult,
} from '@/types/template-library';

function mapTemplateLibraryItem(row: Record<string, unknown>): TemplateLibraryItem {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    setupGuide: (row.setup_guide as string | null) ?? null,
    workflowJson: JSON.stringify(row.workflow_json, null, 2),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export async function getTemplateLibraryWithPagination(
  params: GetTemplateLibraryParams
): Promise<GetTemplateLibraryResult> {
  try {
    await checkAdminOrManagerAuth();

    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '10');
    const search = params.search || '';
    const sortField = params.sortField || 'created_at';
    const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();
    let query = supabase.from('template_library').select('*', { count: 'exact' });

    if (search) {
      query = query.or(buildOrIlikeFilter(['title', 'description', 'setup_guide'], search));
    }

    const dbSort = sortField === 'createdAt' ? 'created_at' : sortField === 'updatedAt' ? 'updated_at' : sortField;

    query = query.order(dbSort, { ascending: sortDirection === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const items = (data || []).map((row) => mapTemplateLibraryItem(row as Record<string, unknown>));
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { items, totalCount, totalPages, currentPage: page, limit };
  } catch (error) {
    logger.error('Error fetching template library', { error: (error as Error).message });
    throw error;
  }
}

export async function getTemplateLibraryById(id: string): Promise<TemplateLibraryItem | false> {
  try {
    await checkAdminOrManagerAuth();

    const supabase = createAdminClient();
    const { data, error } = await supabase.from('template_library').select('*').eq('id', id).single();

    if (error || !data) return false;
    return mapTemplateLibraryItem(data as Record<string, unknown>);
  } catch (error) {
    logger.error('Error fetching template library item', { error: (error as Error).message });
    throw error;
  }
}

export async function createTemplateLibraryItemAction(
  _prevState: TemplateLibraryFormState,
  formData: FormData
): Promise<TemplateLibraryFormState> {
  try {
    const session = await checkAdminAuth();

    const data = {
      title: formData.get('title')?.toString() ?? '',
      description: formData.get('description')?.toString() ?? '',
      setup_guide: formData.get('setup_guide')?.toString() ?? '',
      workflow_json: formData.get('workflow_json')?.toString() ?? '',
    };

    const parsed = createTemplateLibrarySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    let parsedWorkflowJson: unknown;
    try {
      parsedWorkflowJson = JSON.parse(parsed.data.workflow_json);
    } catch {
      return {
        success: false,
        errors: { workflow_json: ['invalidTemplateJson'] },
        formData: data,
        globalError: null,
      };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('template_library').insert({
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      setup_guide: parsed.data.setup_guide?.trim() || null,
      workflow_json: parsedWorkflowJson,
    });

    if (error) throw error;

    logger.info('Template library item created', { adminId: session.user.id });
    revalidatePath('/manage/templates');
  } catch (error) {
    logger.error('Error creating template library item', { error: (error as Error).message });
    return {
      success: false,
      errors: {},
      formData: {
        title: formData.get('title')?.toString() ?? '',
        description: formData.get('description')?.toString() ?? '',
        setup_guide: formData.get('setup_guide')?.toString() ?? '',
        workflow_json: formData.get('workflow_json')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/manage/templates?message=templateLibraryCreatedSuccess');
}

export async function updateTemplateLibraryItemAction(
  id: string,
  _prevState: TemplateLibraryFormState,
  formData: FormData
): Promise<TemplateLibraryFormState> {
  try {
    const session = await checkAdminAuth();

    const data = {
      title: formData.get('title')?.toString() ?? '',
      description: formData.get('description')?.toString() ?? '',
      setup_guide: formData.get('setup_guide')?.toString() ?? '',
      workflow_json: formData.get('workflow_json')?.toString() ?? '',
    };

    const parsed = updateTemplateLibrarySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        errors: formatZodErrors(parsed.error),
        formData: data,
        globalError: null,
      };
    }

    let parsedWorkflowJson: unknown;
    try {
      parsedWorkflowJson = JSON.parse(parsed.data.workflow_json);
    } catch {
      return {
        success: false,
        errors: { workflow_json: ['invalidTemplateJson'] },
        formData: data,
        globalError: null,
      };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('template_library')
      .update({
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        setup_guide: parsed.data.setup_guide?.trim() || null,
        workflow_json: parsedWorkflowJson,
      })
      .eq('id', id);

    if (error) throw error;

    logger.info('Template library item updated', { adminId: session.user.id, id });
    revalidatePath('/manage/templates');
    revalidatePath(`/manage/templates/${id}`);
  } catch (error) {
    logger.error('Error updating template library item', { error: (error as Error).message });
    return {
      success: false,
      errors: {},
      formData: {
        title: formData.get('title')?.toString() ?? '',
        description: formData.get('description')?.toString() ?? '',
        setup_guide: formData.get('setup_guide')?.toString() ?? '',
        workflow_json: formData.get('workflow_json')?.toString() ?? '',
      },
      globalError: 'unexpectedError',
    };
  }
  redirect('/manage/templates?message=templateLibraryUpdatedSuccess');
}

export async function deleteTemplateLibraryItemAction(id: string): Promise<{ success: boolean }> {
  try {
    const session = await checkAdminAuth();

    const supabase = createAdminClient();
    const { error } = await supabase.from('template_library').delete().eq('id', id);

    if (error) throw error;

    logger.info('Template library item deleted', { adminId: session.user.id, id });
    revalidatePath('/manage/templates');
    return { success: true };
  } catch (error) {
    logger.error('Error deleting template library item', { error: (error as Error).message });
    throw error;
  }
}
