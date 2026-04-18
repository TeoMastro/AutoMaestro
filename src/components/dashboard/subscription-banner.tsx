'use client';

import { useTranslations } from 'next-intl';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { badgeStyles } from '@/lib/badge-styles';
import { Clock, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionBannerProps {
  isTrialing: boolean;
  isPastDue: boolean;
  trialDaysLeft: number;
  currentTier: string | null;
}

export function SubscriptionBanner({ isTrialing, isPastDue, trialDaysLeft, currentTier }: SubscriptionBannerProps) {
  const t = useTranslations('app');

  if (isPastDue) {
    return (
      <Alert variant="destructive" className="items-center [&>svg]:translate-y-0">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{t('paymentFailed')}</span>
          <ManageButton />
        </AlertDescription>
      </Alert>
    );
  }

  if (isTrialing) {
    return (
      <Alert className="items-center [&>svg]:translate-y-0">
        <Clock className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{t('trialEndsIn', { days: trialDaysLeft })}</span>
          <Button asChild size="sm" variant="default">
            <Link href="/pricing">{t('choosePlan')}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (currentTier) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={badgeStyles.indigo}>
          {t(`tier${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}`)}
        </Badge>
      </div>
    );
  }

  return (
    <Alert className="items-center [&>svg]:translate-y-0">
      <Sparkles className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{t('noSubscriptionYet')}</span>
        <Button asChild size="sm" variant="default">
          <Link href="/pricing">{t('upgradeToPremium')}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ManageButton() {
  const t = useTranslations('app');

  const handleManage = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleManage}>
      {t('manageSubscription')}
    </Button>
  );
}
