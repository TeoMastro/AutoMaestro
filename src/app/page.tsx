import { SiteHeader } from '@/components/landing/site-header';
import { HeroSection } from '@/components/landing/hero-section';
import { ProblemSection } from '@/components/landing/problem-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { ObservabilitySection } from '@/components/landing/observability-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { OpenSourceSection } from '@/components/landing/open-source-section';
import { FaqSection } from '@/components/landing/faq-section';
import { FinalCtaSection } from '@/components/landing/final-cta-section';
import { SiteFooter } from '@/components/landing/site-footer';

export default function MarketingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <ObservabilitySection />
        <HowItWorksSection />
        <OpenSourceSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
