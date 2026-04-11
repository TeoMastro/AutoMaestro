'use server';

import { getSession } from '@/lib/auth-session';
import { createClient } from '@/lib/supabase/server';
import { updateProfileSchema, formatZodErrors } from '@/lib/validation-schemas';
import { ProfileFormState } from '@/types/user';
import logger from '@/lib/logger';
import { revalidatePath } from 'next/cache';

export async function updateProfileAction(prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await getSession();
  if (!session) {
    return {
      ...prevState,
      success: false,
      globalError: 'somethingWentWrong',
    };
  }

  const rawData = {
    first_name: formData.get('first_name')?.toString() ?? '',
    last_name: formData.get('last_name')?.toString() ?? '',
  };

  const parsed = updateProfileSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      formData: rawData,
      globalError: null,
    };
  }

  try {
    const supabase = await createClient();

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (profileError) {
      logger.error('Error updating profile', { error: profileError.message });
      return {
        success: false,
        errors: {},
        formData: rawData,
        globalError: 'somethingWentWrong',
      };
    }

    // Sync auth metadata
    await supabase.auth.updateUser({
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
      },
    });

    revalidatePath('/', 'layout');

    logger.info('Profile updated', { userId: session.user.id });

    return {
      success: true,
      errors: {},
      formData: parsed.data,
      globalError: null,
    };
  } catch (error) {
    logger.error('Error updating profile', {
      error: (error as Error).message,
    });
    return {
      success: false,
      errors: {},
      formData: rawData,
      globalError: 'somethingWentWrong',
    };
  }
}
