import { GitFork, Github, Heart, Library, Server, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from './animated-section';
import { GITHUB_REPO_URL, GITHUB_WORKFLOWS_REPO_URL } from '@/lib/constants';

const pillars = [
  {
    icon: Github,
    title: 'GPL-3.0 Licensed',
    description:
      'Free to use, modify, and self-host. Derivative works must remain open source under the same license.',
  },
  {
    icon: Server,
    title: 'Self-host anywhere',
    description: 'Run it on your own infrastructure. Your data, your n8n instance, your control end-to-end.',
  },
  {
    icon: Heart,
    title: 'Community-driven',
    description: 'Issues, pull requests, and contributions welcome. Shape the roadmap with the rest of us.',
  },
];

export function OpenSourceSection() {
  return (
    <section id="open-source" className="w-full border-y bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
              <Github className="h-3.5 w-3.5" />
              100% open source
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Free and open source, forever</h2>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              No tiers. No trials. No payment processor. Clone the repo, plug in your Supabase + n8n, and you&rsquo;re
              live.
            </p>
          </div>
        </AnimatedSection>

        <div className="mx-auto mb-12 max-w-5xl grid gap-6 md:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <AnimatedSection key={pillar.title} delay={i * 100}>
                <div className="h-full rounded-xl border-2 border-border bg-card p-8 transition-all duration-300 hover:border-primary/30">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={300}>
          <div className="mx-auto mb-12 max-w-4xl rounded-2xl border-2 border-primary/20 bg-card p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Library className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">A growing library of n8n workflows</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed md:text-base">
                    The template library is powered by a separate open-source repo of ready-to-import n8n workflows. Use
                    them as-is, fork them, or contribute your own — every workflow merged becomes available to the whole
                    community.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                <Button asChild variant="outline" size="lg" className="h-11">
                  <a href={GITHUB_WORKFLOWS_REPO_URL} target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-4 w-4" />
                    Browse workflows
                  </a>
                </Button>
                <Button asChild size="lg" className="h-11 shadow-md shadow-primary/20">
                  <a href={`${GITHUB_WORKFLOWS_REPO_URL}/pulls`} target="_blank" rel="noopener noreferrer">
                    <GitFork className="mr-2 h-4 w-4" />
                    Contribute
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-8 text-base shadow-md shadow-primary/20">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                <Star className="mr-2 h-4 w-4" />
                Star on GitHub
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">If this saves you time, a star helps others find it.</p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
