import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { Role, Status, SubscriptionStatus } from '@/lib/constants';
import { PricingPlans } from '@/components/pricing/pricing-plans';
import { getTranslations } from 'next-intl/server';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default async function PricingPage() {
  const session = await getSession();

  if (!session || session.user.status !== Status.ACTIVE) {
    redirect('/auth/signin');
  }

  const t = await getTranslations('app');

  const expiredReasonKey = getExpiredReasonKey(
    session.user.role,
    session.user.subscription_status,
    session.user.trial_ends_at
  );

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      {expiredReasonKey && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('subscriptionEndedTitle')}</AlertTitle>
          <AlertDescription>{t(expiredReasonKey)}</AlertDescription>
        </Alert>
      )}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{t('choosePlan')}</h1>
        <p className="text-muted-foreground">{t('choosePlanDescription')}</p>
      </div>
      <PricingPlans
        currentTier={session.user.subscription_tier}
        subscriptionStatus={session.user.subscription_status}
      />
    </div>
  );
}

function getExpiredReasonKey(role: string, status: string, trialEndsAt: Date | null): string | null {
  if (role !== Role.MANAGER) return null;

  if (status === SubscriptionStatus.TRIALING) {
    return trialEndsAt && trialEndsAt <= new Date() ? 'trialEndedBannerMessage' : null;
  }
  if (status === SubscriptionStatus.CANCELED) return 'subscriptionCanceledBannerMessage';
  if (status === SubscriptionStatus.UNPAID) return 'subscriptionUnpaidBannerMessage';
  if (status === SubscriptionStatus.PAST_DUE) return 'subscriptionPastDueBannerMessage';

  return null;
}
