'use client';

import { useActionState, useState, useRef, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  createCompanyAction,
  updateCompanyAction,
  uploadCompanyLogoAction,
  deleteCompanyLogoAction,
} from '@/server-actions/company';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoAlert } from '@/components/info-alert';
import { CompanyFormProps, CompanyFormState } from '@/types/company';
import { Upload, Trash2 } from 'lucide-react';

export function CompanyForm({
  company,
  mode,
  logoUrl: initialLogoUrl,
}: CompanyFormProps & { logoUrl?: string | null }) {
  const t = useTranslations('app');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialLogoUrl ?? null
  );
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const initialState: CompanyFormState = {
    success: false,
    errors: {},
    formData: {
      name: company?.name ?? '',
      note: company?.note ?? '',
    },
    globalError: null,
  };

  const actionWrapper = async (
    prevState: CompanyFormState,
    formData: FormData
  ): Promise<CompanyFormState> => {
    if (mode === 'create') {
      return createCompanyAction(prevState, formData);
    }
    return updateCompanyAction(company!.id, prevState, formData);
  };

  const [state, formAction, isPending] = useActionState(
    actionWrapper,
    initialState
  );

  const err = (field: string) => {
    const errs = state.errors[field];
    return errs?.length ? t(errs[0]) : null;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    setLogoError(null);

    if (file.size > 2 * 1024 * 1024) {
      setLogoError(t('logoTooLarge'));
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setLogoError(t('logoInvalidType'));
      return;
    }

    startUploadTransition(async () => {
      const fd = new FormData();
      fd.append('logo', file);

      const result = await uploadCompanyLogoAction(company.id, fd);

      if (result.success && result.signedUrl) {
        setLogoPreview(result.signedUrl);
      } else if (result.error) {
        setLogoError(t(result.error));
      }
    });
  };

  const handleDeleteLogo = () => {
    if (!company?.id) return;
    startDeleteTransition(async () => {
      const result = await deleteCompanyLogoAction(company.id);
      if (result.success) {
        setLogoPreview(null);
      }
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? t('createCompany') : t('updateCompany')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="space-y-4">
          {state.globalError && (
            <InfoAlert message={t(state.globalError)} type="error" />
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t('companyName')}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={state.formData.name}
              className={state.errors.name ? 'border-red-500' : ''}
              required
            />
            {err('name') && (
              <p className="text-sm text-red-500">{err('name')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">{t('companyNote')}</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={state.formData.note}
              rows={3}
            />
          </div>

          {mode === 'update' && (
            <div className="space-y-3">
              <Label>{t('companyLogo')}</Label>
              <div className="flex flex-col items-start gap-3">
                <div className="relative">
                  {logoPreview ? (
                    <div className="relative w-24 h-24 rounded-lg border overflow-hidden bg-muted">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="w-full h-full object-contain"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Upload className="w-4 h-4 text-white animate-pulse" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
                      <span className="text-xs text-muted-foreground text-center px-2">
                        {t('noLogo')}
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {t('uploadLogo')}
                  </Button>
                  {logoPreview && !isUploading && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteLogo}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('deleteLogo')}
                    </Button>
                  )}
                </div>
              </div>
              {logoError && <p className="text-sm text-red-500">{logoError}</p>}
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending
                ? t('saving')
                : mode === 'create'
                  ? t('create')
                  : t('update')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
