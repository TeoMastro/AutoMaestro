'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoAlert } from '@/components/info-alert';
import { Pencil, CreditCard, ExternalLink, Sparkles, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { updateProfileAction } from '@/server-actions/profile';
import { Role, SubscriptionStatus } from '@/lib/constants';
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
  subscription_tier: string | null;
  subscription_status: string;
  subscription_end_date: Date | null;
  trial_ends_at: Date | null;
}

interface ManagerSubscription {
  subscription_end_date: string | null;
  trial_ends_at: string | null;
  subscription_status: string;
  subscription_tier: string | null;
}

interface ProfileCardProps {
  user: ProfileCardUser;
  companies: { id: string; name: string }[];
  managerSubscription?: ManagerSubscription | null;
}

export function ProfileCard({ user, companies, managerSubscription }: ProfileCardProps) {
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
  const showSubscription = user.role !== Role.ADMIN;
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // error handled silently
    } finally {
      setPortalLoading(false);
    }
  };

  const getSubscriptionEndDate = (): string | null => {
    if (user.role === Role.MANAGER) {
      if (user.subscription_status === SubscriptionStatus.TRIALING && user.trial_ends_at) {
        return new Date(user.trial_ends_at).toLocaleDateString();
      }
      if (user.subscription_end_date) {
        return new Date(user.subscription_end_date).toLocaleDateString();
      }
      return null;
    }

    if (user.role === Role.CLIENT && managerSubscription) {
      if (managerSubscription.subscription_status === 'trialing' && managerSubscription.trial_ends_at) {
        return new Date(managerSubscription.trial_ends_at).toLocaleDateString();
      }
      if (managerSubscription.subscription_end_date) {
        return new Date(managerSubscription.subscription_end_date).toLocaleDateString();
      }
    }

    return null;
  };

  const getSubscriptionStatusBadge = () => {
    const status = user.role === Role.CLIENT
      ? managerSubscription?.subscription_status || 'none'
      : user.subscription_status;

    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return <Badge variant="outline" className={badgeStyles.green}>{t('subscriptionActive')}</Badge>;
      case SubscriptionStatus.TRIALING:
        return <Badge variant="outline" className={badgeStyles.amber}>{t('subscriptionTrialing')}</Badge>;
      case SubscriptionStatus.PAST_DUE:
        return <Badge variant="outline" className={badgeStyles.red}>{t('subscriptionPastDue')}</Badge>;
      case SubscriptionStatus.CANCELED:
        return <Badge variant="outline" className={badgeStyles.red}>{t('subscriptionCanceled')}</Badge>;
      default:
        return <Badge variant="outline" className={badgeStyles.slate}>{t('subscriptionNone')}</Badge>;
    }
  };

  const getTierLabel = () => {
    const tier = user.role === Role.CLIENT
      ? managerSubscription?.subscription_tier
      : user.subscription_tier;

    if (!tier) return null;
    return t(`tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`);
  };

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

            {showSubscription && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">{t('subscriptionInfo')}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getSubscriptionStatusBadge()}
                      {getTierLabel() && (
                        <Badge variant="outline" className={badgeStyles.indigo}>
                          {getTierLabel()}
                        </Badge>
                      )}
                    </div>

                    {user.role === Role.CLIENT && (
                      <p className="text-sm text-muted-foreground">{t('accessProvidedByManager')}</p>
                    )}

                    {(() => {
                      const endDate = getSubscriptionEndDate();
                      if (!endDate) return null;
                      return (
                        <p className="text-sm">
                          {user.subscription_status === SubscriptionStatus.TRIALING
                            ? t('trialEndsOn', { date: endDate })
                            : t('accessUntil', { date: endDate })}
                        </p>
                      );
                    })()}

                    {user.role === Role.MANAGER && user.subscription_status !== SubscriptionStatus.NONE && user.subscription_status !== SubscriptionStatus.TRIALING && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleManageSubscription}
                          disabled={portalLoading}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {portalLoading ? t('loading') : t('manageSubscription')}
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/pricing">
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            {t('changePlan')}
                          </Link>
                        </Button>
                      </div>
                    )}

                    {user.role === Role.MANAGER && user.subscription_status === SubscriptionStatus.TRIALING && (
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link href="/pricing">
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          {t('changePlan')}
                        </Link>
                      </Button>
                    )}

                    {user.role === Role.MANAGER && (user.subscription_status === SubscriptionStatus.NONE || user.subscription_status === SubscriptionStatus.CANCELED) && (
                      <Button asChild size="sm" variant="default" className="mt-2">
                        <Link href="/pricing">
                          <Sparkles className="h-4 w-4 mr-2" />
                          {t('upgradeToPremium')}
                        </Link>
                      </Button>
                    )}
                  </div>
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
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
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
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      disabled={isSubmitting}
                      className={fieldErrors.newPassword ? 'border-red-500' : ''}
                    />
                    {fieldErrors.newPassword && <p className="text-sm text-red-500">{t(fieldErrors.newPassword[0])}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
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
