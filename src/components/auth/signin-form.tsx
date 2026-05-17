'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { validateSigninData } from '@/server-actions/auth';
import { ValidationState } from '@/types/auth';
import Link from 'next/link';
import { InfoAlert } from '../info-alert';

interface LoginFormProps {
  error?: string;
  message?: string;
}

export function SigninForm({ error, message }: LoginFormProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showMessage, setShowMessage] = useState(!!message);
  const router = useRouter();
  const t = useTranslations('app');
  const supabase = createClient();

  const initialState: ValidationState = {
    errors: {},
    data: null,
    success: false,
    formData: { email: '', password: '' },
  };

  const [state, formAction] = useActionState(validateSigninData, initialState);
  const handleAuthentication = useCallback(
    async (data: { email: string; password: string }) => {
      setIsSigningIn(true);
      setAuthError('');
      setShowMessage(false);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setAuthError(t('emailNotVerified'));
          } else {
            setAuthError(t('invalidCredentials'));
          }
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      } catch (error) {
        setAuthError(t('somethingWentWrong'));
      } finally {
        setIsSigningIn(false);
      }
    },
    [t, router, supabase]
  );

  useEffect(() => {
    if (state.success && state.data) {
      handleAuthentication(state.data);
    }
  }, [state, handleAuthentication]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('signIn')}</CardTitle>
      </CardHeader>

      <form action={formAction} noValidate>
        <CardContent className="space-y-4 mb-5">
          {(error || authError) && <InfoAlert message={error || authError} type="error" />}

          {message && showMessage && <InfoAlert message={message} type="success" />}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('enterEmail')}
              disabled={isSigningIn}
              defaultValue={state.formData?.email || ''}
              className={state.errors.email ? 'border-red-500' : ''}
            />
            {state.errors.email && <p className="text-sm text-red-500">{t(state.errors.email[0])}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder={t('enterPassword')}
              disabled={isSigningIn}
              defaultValue={state.formData?.password || ''}
              className={state.errors.password ? 'border-red-500' : ''}
            />
            {state.errors.password && <p className="text-sm text-red-500">{t(state.errors.password[0])}</p>}
          </div>

          <div className="flex items-center justify-end">
            <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isSigningIn}>
            {t('signIn')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
