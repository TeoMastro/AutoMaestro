import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnimatedSection } from '@/components/landing/animated-section';
import { APP_NAME } from '@/lib/constants';

const faqs = [
  {
    q: 'Do I need my own n8n instance?',
    a: `Yes. ${APP_NAME} connects to your existing n8n instance via encrypted credentials. You keep full control of your workflows — we provide the branded client-facing layer on top.`,
  },
  {
    q: 'What happens during the free trial?',
    a: 'You get 14 days with Freelancer-tier limits — 3 companies, 10 workflows, 10 clients. No credit card required to start. Upgrade or cancel anytime.',
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
