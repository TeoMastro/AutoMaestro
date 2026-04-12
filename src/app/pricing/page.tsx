import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { Status } from '@/lib/constants';
import { PricingPlans } from '@/components/pricing/pricing-plans';
import { getTranslations } from 'next-intl/server';

export default async function PricingPage() {
  const session = await getSession();

  if (!session || session.user.status !== Status.ACTIVE) {
    redirect('/auth/signin');
  }

  const t = await getTranslations('app');

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
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
