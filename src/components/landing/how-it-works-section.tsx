import { AnimatedSection } from '@/components/landing/animated-section';

const steps = [
  {
    step: '01',
    title: 'Connect your n8n',
    description:
      'Add your n8n instance credentials per company. They are encrypted at rest and never exposed to clients.',
  },
  {
    step: '02',
    title: 'Configure workflows',
    description:
      'Create Chat and Trigger workflows, upload documents to build knowledge bases, and assign everything to the right clients.',
  },
  {
    step: '03',
    title: 'Invite & monitor',
    description:
      'Send clients to their branded portal. Every chat, trigger, and document upload flows through your dashboard in real time.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="w-full py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Live in three steps</h2>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              No migration, no rip-and-replace. Plug in your n8n and go.
            </p>
          </div>
        </AnimatedSection>

        <div className="mx-auto max-w-4xl grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((item, i) => (
            <AnimatedSection key={item.step} delay={i * 120}>
              <div className="relative text-center md:text-left">
                <span className="inline-block text-6xl font-bold text-primary/30 dark:text-primary/20 font-mono leading-none mb-2">
                  {item.step}
                </span>
                <h3 className="mb-2 font-bold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
