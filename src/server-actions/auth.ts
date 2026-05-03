'use server';

import { getServerTranslation } from '@/lib/server-translations';
import { ForgotPasswordState, ValidationState } from '@/types/auth';
import { signinSchema, formatZodErrors, forgotPasswordSchema } from '@/lib/validation-schemas';
import logger from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export async function validateSigninData(prevState: ValidationState, formData: FormData): Promise<ValidationState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const validatedFields = signinSchema.safeParse({
    email,
    password,
  });

  if (!validatedFields.success) {
    return {
      errors: formatZodErrors(validatedFields.error),
      data: null,
      success: false,
      formData: { email, password: '' },
    };
  }

  return {
    errors: {},
    data: validatedFields.data,
    success: true,
    formData: { email, password: '' },
  };
}

export async function forgotPasswordAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get('email')?.toString() ?? '';

  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return {
      success: false,
      errors: formatZodErrors(parsed.error),
      formData: { email },
      globalError: null,
    };
  }

  const trimmedEmail = parsed.data.email.trim().toLowerCase();

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      logger.error('Error during forgot password', {
        error: error.message,
        action: 'forgotPassword',
      });
    }

    // Always return success (don't reveal if email exists)
    return {
      success: true,
      errors: {},
      formData: { email: '' },
      globalError: null,
      message: await getServerTranslation('app', 'resetEmailSent'),
    };
  } catch (error) {
    logger.error('Error during forgot password', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      action: 'forgotPassword',
    });

    return {
      success: false,
      errors: {},
      formData: { email },
      globalError: 'somethingWentWrong',
    };
  }
}
