'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check } from 'lucide-react';
import { badgeStyles } from '@/lib/badge-styles';
import { InfoAlert } from '@/components/info-alert';

interface PricingPlansProps {
  currentTier: string | null;
  subscriptionStatus: string;
}

const PLANS = [
  {
    tier: 'freelancer',
    monthlyPrice: 29,
    annualPrice: 290,
    companies: 3,
    workflows: 10,
    clients: 10,
    popular: false,
  },
  {
    tier: 'agency',
    monthlyPrice: 79,
    annualPrice: 790,
    companies: 10,
    workflows: 50,
    clients: 50,
    popular: true,
  },
  {
    tier: 'scale',
    monthlyPrice: 149,
    annualPrice: 1490,
    companies: -1, // unlimited
    workflows: -1,
    clients: -1,
    popular: false,
  },
];

function getPriceEnvMap(): Record<string, { monthly: string; annual: string }> {
  return {
    freelancer: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREELANCER_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREELANCER_ANNUAL || '',
    },
    agency: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL || '',
    },
    scale: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE_MONTHLY || '',
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE_ANNUAL || '',
    },
  };
}

export function PricingPlans({ currentTier, subscriptionStatus }: PricingPlansProps) {
  const t = useTranslations('app');
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTier, setConfirmTier] = useState<string | null>(null);

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'past_due';

  const TIER_ORDER: Record<string, number> = { freelancer: 1, agency: 2, scale: 3 };

  const handleSubscribe = async (tier: string) => {
    // If switching an active plan, show confirmation first
    if (isActive && currentTier && tier !== currentTier) {
      setConfirmTier(tier);
      return;
    }

    await executePlanAction(tier);
  };

  const executePlanAction = async (tier: string) => {
    setLoadingTier(tier);
    setError(null);

    try {
      const prices = getPriceEnvMap()[tier];
      const priceId = isAnnual ? prices.annual : prices.monthly;

      if (isActive && currentTier) {
        // Switch plan on existing subscription
        const res = await fetch('/api/stripe/switch-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === 'downgradeBlocked') {
            const parts: string[] = [];
            for (const resource of data.exceeded as string[]) {
              const current = data.usage[resource];
              const limit = data.targetLimits[resource];
              parts.push(t(`${resource}UsageExceeds`, { current, limit }));
            }
            setError(t('downgradeBlocked') + ' ' + parts.join(' '));
          } else {
            setError(t('somethingWentWrong'));
          }
          return;
        }

        // Refresh the page to reflect the new tier
        window.location.reload();
      } else {
        // New subscription — create checkout session
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        });

        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch {
      setError(t('somethingWentWrong'));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingTier('manage');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // error handled silently
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <InfoAlert message={error} type="error" />
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
          {t('monthlyBilling')}
        </Label>
        <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
        <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
          {t('annualBilling')}
        </Label>
        {isAnnual && (
          <Badge variant="outline" className={badgeStyles.green}>
            {t('save2Months')}
          </Badge>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = isActive && currentTier === plan.tier;
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const period = isAnnual ? t('perYear') : t('perMonth');

          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">{t('mostPopular')}</Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-xl">{t(`tier${capitalize(plan.tier)}`)}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{formatPrice(price)}</span>
                  <span className="text-muted-foreground">{period}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                <Feature text={plan.companies === -1 ? t('unlimitedCompanies') : t('companiesLimit', { count: plan.companies })} />
                <Feature text={plan.workflows === -1 ? t('unlimitedWorkflows') : t('workflowsLimit', { count: plan.workflows })} />
                <Feature text={plan.clients === -1 ? t('unlimitedClients') : t('clientsLimit', { count: plan.clients })} />
                <Feature text={t(`support${capitalize(plan.tier)}`)} />
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={loadingTier === 'manage'}
                  >
                    {loadingTier === 'manage' ? t('loading') : t('manageSubscription')}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.tier)}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === plan.tier
                      ? t('loading')
                      : isActive
                        ? t('switchPlan')
                        : t('subscribe')}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Plan switch confirmation dialog */}
      <AlertDialog open={confirmTier !== null} onOpenChange={(open) => { if (!open) setConfirmTier(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmSwitchPlan')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTier && (() => {
                const plan = PLANS.find((p) => p.tier === confirmTier);
                if (!plan) return null;
                const price = formatPrice(isAnnual ? plan.annualPrice : plan.monthlyPrice);
                const planName = t(`tier${capitalize(confirmTier)}`);
                const isUpgrade = (TIER_ORDER[confirmTier] ?? 0) > (TIER_ORDER[currentTier ?? ''] ?? 0);

                return isUpgrade
                  ? t('switchPlanUpgradeDescription', { plan: planName, price })
                  : t('switchPlanDowngradeDescription', { plan: planName, price });
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const tier = confirmTier;
                setConfirmTier(null);
                if (tier) executePlanAction(tier);
              }}
            >
              {t('confirmSwitch')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-primary shrink-0" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(amount);
}
