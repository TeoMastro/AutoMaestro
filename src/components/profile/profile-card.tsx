'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoAlert } from '@/components/info-alert';
import { Pencil } from 'lucide-react';
import { updateProfileAction } from '@/server-actions/profile';
import { Role } from '@/lib/constants';
import { badgeStyles } from '@/lib/badge-styles';
import {
  updateProfileSchema,
  changeEmailSchema,
  changePasswordSchema,
  formatZodErrors,
} from '@/lib/validation-schemas';

interface ProfileCardUser {
  id: string;
  email: string;
  role: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  createdAt: Date;
}

interface ProfileCardProps {
  user: ProfileCardUser;
  companies: { id: string; name: string }[];
}

export function ProfileCard({ user, companies }: ProfileCardProps) {
  const t = useTranslations('app');
  const supabase = createClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
      case 'MANAGER':
        return badgeStyles.indigo;
      default:
        return badgeStyles.slate;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return t('adminRole');
      case 'MANAGER':
        return t('managerRole');
      default:
        return t('clientRole');
    }
  };

  const handleSave = async (formData: FormData) => {
    setIsSubmitting(true);
    setFieldErrors({});
    setGlobalError(null);
    setSuccessMessage(null);

    const firstName = formData.get('first_name')?.toString() ?? '';
    const lastName = formData.get('last_name')?.toString() ?? '';
    const newEmail = formData.get('email')?.toString() ?? '';
    const currentPassword = formData.get('currentPassword')?.toString() ?? '';
    const newPassword = formData.get('newPassword')?.toString() ?? '';
    const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

    const allErrors: Record<string, string[]> = {};
    const messages: string[] = [];

    // --- Validate & save name ---
    const nameParsed = updateProfileSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
    });

    if (!nameParsed.success) {
      Object.assign(allErrors, formatZodErrors(nameParsed.error));
    } else {
      const nameFormData = new FormData();
      nameFormData.set('first_name', firstName);
      nameFormData.set('last_name', lastName);

      const result = await updateProfileAction(
        {
          success: false,
          errors: {},
          formData: { first_name: firstName, last_name: lastName },
          globalError: null,
        },
        nameFormData
      );

      if (!result.success) {
        if (result.globalError) {
          setGlobalError(t(result.globalError));
          setIsSubmitting(false);
          return;
        }
        Object.assign(allErrors, result.errors);
      } else {
        messages.push(t('profileUpdatedSuccess'));
      }
    }

    // --- Validate & save email (only if changed) ---
    if (newEmail && newEmail !== user.email) {
      const emailParsed = changeEmailSchema.safeParse({ email: newEmail });

      if (!emailParsed.success) {
        Object.assign(allErrors, formatZodErrors(emailParsed.error));
      } else {
        try {
          const { error } = await supabase.auth.updateUser({
            email: emailParsed.data.email,
          });

          if (error) {
            allErrors.email = ['somethingWentWrong'];
          } else {
            messages.push(t('emailChangeConfirmation'));
          }
        } catch {
          allErrors.email = ['somethingWentWrong'];
        }
      }
    }

    // --- Validate & save password (only if any password field is filled) ---
    if (currentPassword || newPassword || confirmPassword) {
      const passwordParsed = changePasswordSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!passwordParsed.success) {
        Object.assign(allErrors, formatZodErrors(passwordParsed.error));
      } else {
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwordParsed.data.currentPassword,
          });

          if (signInError) {
            allErrors.currentPassword = ['incorrectPassword'];
          } else {
            const { error: updateError } = await supabase.auth.updateUser({
              password: passwordParsed.data.newPassword,
            });

            if (updateError) {
              setGlobalError(t('somethingWentWrong'));
              setIsSubmitting(false);
              return;
            }

            messages.push(t('passwordChangedSuccess'));
          }
        } catch {
          setGlobalError(t('somethingWentWrong'));
          setIsSubmitting(false);
          return;
        }
      }
    }

    setIsSubmitting(false);

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      return;
    }

    if (messages.length > 0) {
      setSuccessMessage(messages.join(' '));
      setIsEditing(false);
    }
  };

  const showCompany = user.role !== Role.ADMIN;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('profile')}</CardTitle>
        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsEditing(true);
              setSuccessMessage(null);
              setGlobalError(null);
              setFieldErrors({});
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {successMessage && (
          <div className="mb-6">
            <InfoAlert message={successMessage} type="success" />
          </div>
        )}
        {globalError && (
          <div className="mb-6">
            <InfoAlert message={globalError} type="error" />
          </div>
        )}

        {!isEditing ? (
          /* ==================== VIEW MODE ==================== */
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{fullName}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className={getRoleBadgeStyle(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge variant="outline" className={badgeStyles.green}>
                    {t('active')}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('firstName')}</p>
                <p className="text-sm">{user.first_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('lastName')}</p>
                <p className="text-sm">{user.last_name || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('email')}</p>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('password')}</p>
                <p className="text-sm">••••••••</p>
              </div>
            </div>

            {showCompany && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {user.role === Role.CLIENT ? t('yourCompany') : t('yourCompanies')}
                  </p>
                  {companies.length > 0 ? (
                    user.role === Role.CLIENT ? (
                      <p className="text-sm">{companies[0].name}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {companies.map((c) => (
                          <Badge key={c.id} variant="secondary">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('noCompanyAssigned')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* ==================== EDIT MODE ==================== */
          <form action={handleSave} noValidate className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <Badge variant="outline" className={getRoleBadgeStyle(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge variant="outline" className={badgeStyles.green}>
                    {t('active')}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Name fields */}
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('personalInformation')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t('firstName')}</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    defaultValue={user.first_name || ''}
                    disabled={isSubmitting}
                    className={fieldErrors.first_name ? 'border-red-500' : ''}
                  />
                  {fieldErrors.first_name && <p className="text-sm text-red-500">{t(fieldErrors.first_name[0])}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">{t('lastName')}</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    defaultValue={user.last_name || ''}
                    disabled={isSubmitting}
                    className={fieldErrors.last_name ? 'border-red-500' : ''}
                  />
                  {fieldErrors.last_name && <p className="text-sm text-red-500">{t(fieldErrors.last_name[0])}</p>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Email field */}
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('changeEmail')}</h4>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  disabled={isSubmitting}
                  className={fieldErrors.email ? 'border-red-500' : ''}
                />
                {fieldErrors.email && <p className="text-sm text-red-500">{t(fieldErrors.email[0])}</p>}
              </div>
            </div>

            <Separator />

            {/* Password fields */}
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('changePassword')}</h4>
              <p className="text-sm text-muted-foreground mb-3">{t('leaveEmptyToKeepCurrent')}</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    disabled={isSubmitting}
                    className={fieldErrors.currentPassword ? 'border-red-500' : ''}
                  />
                  {fieldErrors.currentPassword && (
                    <p className="text-sm text-red-500">{t(fieldErrors.currentPassword[0])}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('newPassword')}</Label>
                    <PasswordInput
                      id="newPassword"
                      name="newPassword"
                      placeholder={t('passwordPlaceholder')}
                      disabled={isSubmitting}
                      className={fieldErrors.newPassword ? 'border-red-500' : ''}
                    />
                    {fieldErrors.newPassword && <p className="text-sm text-red-500">{t(fieldErrors.newPassword[0])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
                    <PasswordInput
                      id="confirmPassword"
                      name="confirmPassword"
                      disabled={isSubmitting}
                      className={fieldErrors.confirmPassword ? 'border-red-500' : ''}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-sm text-red-500">{t(fieldErrors.confirmPassword[0])}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {showCompany && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {user.role === Role.CLIENT ? t('yourCompany') : t('yourCompanies')}
                  </p>
                  {companies.length > 0 ? (
                    user.role === Role.CLIENT ? (
                      <p className="text-sm">{companies[0].name}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {companies.map((c) => (
                          <Badge key={c.id} variant="secondary">
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('noCompanyAssigned')}</p>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('saving') : t('saveChanges')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setIsEditing(false);
                  setFieldErrors({});
                  setGlobalError(null);
                }}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
