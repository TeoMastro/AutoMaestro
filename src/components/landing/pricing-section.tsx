'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedSection } from './animated-section';

const plans = [
  {
    name: 'Freelancer',
    monthlyPrice: 29,
    annualPrice: 290,
    description: 'For solo operators managing a handful of client automations.',
    limits: { companies: '3', workflows: '10', clients: '10' },
    popular: false,
  },
  {
    name: 'Agency',
    monthlyPrice: 79,
    annualPrice: 790,
    description: 'For growing teams juggling multiple client accounts.',
    limits: { companies: '10', workflows: '50', clients: '50' },
    popular: true,
  },
  {
    name: 'Scale',
    monthlyPrice: 149,
    annualPrice: 1490,
    description: 'For established operations with no ceiling on growth.',
    limits: { companies: 'Unlimited', workflows: 'Unlimited', clients: 'Unlimited' },
    popular: false,
  },
];

const planFeatures = ['Chat & Trigger workflows', 'Document processing & KB', 'Template library', 'Full observability'];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="w-full border-y bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Simple pricing that scales with you</h2>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              All plans include every feature. The only difference is capacity.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <Label
                htmlFor="billing-toggle"
                className={cn(
                  'text-sm cursor-pointer transition-colors',
                  !isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                Monthly
              </Label>
              <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
              <Label
                htmlFor="billing-toggle"
                className={cn(
                  'text-sm cursor-pointer transition-colors',
                  isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                Annual
              </Label>
              {isAnnual && (
                <span className="ml-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Save ~17%
                </span>
              )}
            </div>
          </div>
        </AnimatedSection>

        <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const period = isAnnual ? '/yr' : '/mo';

            return (
              <AnimatedSection key={plan.name} delay={i * 100}>
                <div
                  className={cn(
                    'relative h-full flex flex-col rounded-xl border-2 bg-card p-8 transition-all duration-300',
                    plan.popular
                      ? 'border-primary shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground">{period}</span>
                    {isAnnual && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        ${Math.round((plan.annualPrice / 12) * 100) / 100}/mo billed annually
                      </p>
                    )}
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {[
                      `${plan.limits.companies} companies`,
                      `${plan.limits.workflows} workflows`,
                      `${plan.limits.clients} clients`,
                      ...planFeatures,
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={plan.popular ? 'default' : 'outline'} className="w-full">
                    <Link href="/auth/signup">Start Free Trial</Link>
                  </Button>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
