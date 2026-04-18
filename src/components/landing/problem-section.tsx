import { X } from 'lucide-react';
import { AnimatedSection } from '@/components/landing/animated-section';

const problems = [
  {
    icon: X,
    title: 'Raw webhook URLs',
    description:
      'You paste a URL in an email and hope the client figures it out. No branding, no guidance, no support.',
  },
  {
    icon: X,
    title: 'Zero visibility',
    description:
      'You have no idea if a workflow was used, what was sent, or what came back. Debugging means asking the client to screenshot.',
  },
  {
    icon: X,
    title: 'No structure at scale',
    description:
      'Three clients is manageable. Thirty is chaos — different URLs, different docs, different Slack threads.',
  },
];

export function ProblemSection() {
  return (
    <section className="w-full border-y bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">The problem</p>
            <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
              Right now, delivering n8n workflows to clients is held together with duct tape
            </h2>
          </div>
        </AnimatedSection>

        <div className="mx-auto mt-12 max-w-4xl grid gap-6 md:grid-cols-3">
          {problems.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 100}>
              <div className="h-full rounded-xl border border-destructive/20 bg-card p-6">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                  <item.icon className="h-4 w-4 text-destructive" />
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
