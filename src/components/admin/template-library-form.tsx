'use client';

import { useActionState, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { createTemplateLibraryItemAction, updateTemplateLibraryItemAction } from '@/server-actions/template-library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoAlert } from '@/components/info-alert';
import type { TemplateLibraryFormProps, TemplateLibraryFormState } from '@/types/template-library';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export function TemplateLibraryForm({ item, mode }: TemplateLibraryFormProps) {
  const t = useTranslations('app');
  const { resolvedTheme } = useTheme();

  const initialState: TemplateLibraryFormState = {
    success: false,
    errors: {},
    formData: {
      title: item?.title ?? '',
      description: item?.description ?? '',
      setup_guide: item?.setupGuide ?? '',
      workflow_json: item?.workflowJson ?? '',
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: TemplateLibraryFormState,
    formData: FormData
  ): Promise<TemplateLibraryFormState> => {
    if (mode === 'create') {
      return createTemplateLibraryItemAction(prevState, formData);
    }
    return updateTemplateLibraryItemAction(item!.id, prevState, formData);
  };

  const [state, formAction, isPending] = useActionState(actionWrapper, initialState);
  const [setupGuide, setSetupGuide] = useState(initialState.formData.setup_guide);
  const colorMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    setSetupGuide(state.formData.setup_guide);
  }, [state.formData.setup_guide]);

  const err = (field: string) => {
    const errs = state.errors[field];
    return errs?.length ? t(errs[0]) : null;
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === 'create' ? t('createTemplateLibraryItem') : t('editTemplateLibraryItem')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="space-y-4">
          {state.globalError && <InfoAlert message={t(state.globalError)} type="error" />}

          <div className="space-y-2">
            <Label htmlFor="title">{t('templateTitle')}</Label>
            <Input
              id="title"
              name="title"
              defaultValue={state.formData.title}
              className={state.errors.title ? 'border-red-500' : ''}
              required
            />
            {err('title') && <p className="text-sm text-red-500">{err('title')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('templateDescription')}</Label>
            <Textarea id="description" name="description" defaultValue={state.formData.description} rows={4} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setup_guide">{t('templateSetupGuide')}</Label>
            <div data-color-mode={colorMode}>
              <MDEditor
                value={setupGuide}
                onChange={(value) => setSetupGuide(value || '')}
                preview="edit"
                height={280}
              />
            </div>
            <input type="hidden" name="setup_guide" value={setupGuide} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow_json">{t('workflowJson')}</Label>
            <Textarea
              id="workflow_json"
              name="workflow_json"
              defaultValue={state.formData.workflow_json}
              rows={14}
              className={`max-h-[32rem] overflow-auto font-mono text-sm${state.errors.workflow_json ? ' border-red-500' : ''}`}
              placeholder='{"name":"My n8n Template","nodes":[],"connections":{}}'
              required
            />
            {err('workflow_json') && <p className="text-sm text-red-500">{err('workflow_json')}</p>}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : mode === 'create' ? t('create') : t('update')}
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
