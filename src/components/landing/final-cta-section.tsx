import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/landing/animated-section';
import { GITHUB_REPO_URL } from '@/lib/constants';

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
              Your automations are already great. Give them a front door that matches — open source, on your own
              infrastructure.
            </p>
            <Button asChild size="lg" className="h-12 px-8 text-base shadow-md shadow-primary/20">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                <Star className="mr-2 h-4 w-4" />
                Star on GitHub
              </a>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">MIT licensed. Self-host on your own infrastructure.</p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
