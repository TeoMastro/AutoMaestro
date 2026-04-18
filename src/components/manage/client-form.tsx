'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { createClientAction } from '@/server-actions/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserFormState } from '@/types/user';
import { Role, Status } from '@/lib/constants';
import { InfoAlert } from '@/components/info-alert';

type ClientFormProps = {
  companyId: string;
};

export function ClientForm({ companyId }: ClientFormProps) {
  const t = useTranslations('app');

  const initialState: UserFormState = {
    success: false,
    errors: {},
    formData: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: Role.CLIENT,
      status: Status.ACTIVE,
    },
    globalError: null,
  };

  const [state, formAction, isPending] = useActionState(createClientAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const getErrorMessage = (field: string) => {
    const errs = state.errors[field];
    if (!errs || errs.length === 0) return null;
    return t(errs[0]);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('createClient')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="space-y-4">
          <input type="hidden" name="company_id" value={companyId} />

          {state.globalError && <InfoAlert message={t(state.globalError)} type="error" />}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('firstName')}</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={state.formData.first_name}
                className={state.errors.first_name ? 'border-red-500' : ''}
                required
              />
              {state.errors.first_name && <p className="text-sm text-red-500">{getErrorMessage('first_name')}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">{t('lastName')}</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={state.formData.last_name}
                className={state.errors.last_name ? 'border-red-500' : ''}
                required
              />
              {state.errors.last_name && <p className="text-sm text-red-500">{getErrorMessage('last_name')}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={state.formData.email}
              className={state.errors.email ? 'border-red-500' : ''}
              required
            />
            {state.errors.email && <p className="text-sm text-red-500">{getErrorMessage('email')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`pr-10 ${state.errors.password ? 'border-red-500' : ''}`}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {state.errors.password && <p className="text-sm text-red-500">{getErrorMessage('password')}</p>}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : t('create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
