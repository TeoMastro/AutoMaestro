import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/landing/animated-section';

export function FinalCtaSection() {
  return (
    <section className="w-full border-t bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Stop duct-taping your client delivery
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Your automations are already great. Give them a front door that matches.
            </p>
            <Button asChild size="lg" className="h-12 px-8 text-base shadow-md shadow-primary/20">
              <Link href="/auth/signup">
                Start My Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">14 days free. No credit card. Cancel anytime.</p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
