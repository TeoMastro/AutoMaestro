import Link from 'next/link';
import { ArrowRight, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/landing/animated-section';
import { HeroVisual } from '@/components/landing/hero-visual';
import { APP_NAME } from '@/lib/constants';

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 lg:pt-32 lg:pb-40">
      {/* Layered background: dot grid + gradient wash */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(circle, oklch(0.465 0.23 265) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_20%,oklch(0.465_0.23_265_/_0.15),transparent_70%)] dark:bg-[radial-gradient(ellipse_100%_80%_at_50%_20%,oklch(0.685_0.169_271_/_0.12),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_75%)]" />

      <div className="container relative mx-auto px-4 max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <AnimatedSection>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
              <Bot className="h-3.5 w-3.5" />
              n8n workflow management for agencies
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]">
              Your n8n workflows{' '}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                deserve a front door
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
              Stop sharing raw webhook URLs with clients. {APP_NAME} gives every customer a branded portal to your
              automations — while you keep full visibility over every company, workflow, and conversation.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-md shadow-primary/20">
                <Link href="/auth/signup">
                  Start My Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <Link href="#features">See How It Works</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">14-day free trial. No credit card required.</p>
          </AnimatedSection>

          {/* Animated connection diagram */}
          <AnimatedSection delay={500}>
            <HeroVisual className="mt-16 md:mt-20" />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
