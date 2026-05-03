import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnimatedSection } from '@/components/landing/animated-section';
import { APP_NAME } from '@/lib/constants';

const faqs = [
  {
    q: 'Do I need my own n8n instance?',
    a: `Yes. ${APP_NAME} connects to your existing n8n instance via encrypted credentials. You keep full control of your workflows — the project provides the branded client-facing layer on top.`,
  },
  {
    q: 'Is it really free?',
    a: `Yes. ${APP_NAME} is MIT licensed and free to self-host forever. There are no plans, no resource limits, no payments — clone the repo, run the migrations, and you're live. The only costs are your own infrastructure (Supabase, n8n, OpenAI for embeddings).`,
  },
  {
    q: 'Where do the workflow templates come from?',
    a: 'The template library is backed by a companion open-source repo of ready-to-import n8n workflows. You can use any of them as-is, customize them for your clients, or contribute your own — every merged workflow becomes available to everyone running the project.',
  },
  {
    q: 'How do I contribute?',
    a: 'Both repos accept issues and pull requests. The frontend lives at github.com/TeoMastro/n8n-whitelabel-frontend, and the workflow library at github.com/TeoMastro/n8n-whitelabel-workflows. Bug reports, feature ideas, and new workflows are all welcome.',
  },
  {
    q: 'Can managers only see specific companies?',
    a: 'Yes. Managers are scoped to the companies they are assigned to. They can only see and manage clients, workflows, and logs for those companies — nothing else.',
  },
  {
    q: 'What document types are supported?',
    a: 'PDF, DOCX, TXT, and Markdown. Files up to 10 MB each, with up to 10 files per upload. They are automatically processed into a vector-searchable knowledge base.',
  },
  {
    q: 'Is my data secure?',
    a: 'n8n credentials are encrypted at rest with AES-256. All database access is enforced by row-level security policies. Managers and clients are scoped so they only access what they should.',
  },
  {
    q: 'Can I white-label the portal for my brand?',
    a: `${APP_NAME} is designed to be your branded portal. The app name, colors, and styling are fully configurable — your clients see your brand, not ours.`,
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="w-full py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Frequently asked questions</h2>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="mx-auto max-w-2xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-base font-medium">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
