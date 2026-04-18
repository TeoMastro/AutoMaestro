import { Building2, FileSearch, LayoutDashboard, LibraryBig, Network, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedSection } from '@/components/landing/animated-section';
import { APP_NAME } from '@/lib/constants';

const features = [
  {
    icon: Network,
    title: 'Workflow Management',
    description:
      'Deploy Chat and Trigger workflows behind your brand. Encrypted credentials per company, secure webhook proxying, and per-client assignments.',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50/80 dark:bg-indigo-950/40',
    border: 'group-hover:border-indigo-200 dark:group-hover:border-indigo-800/50',
  },
  {
    icon: Building2,
    title: 'Multi-Company Tenancy',
    description:
      'Each company gets isolated workflows, documents, and a knowledge base. Manage three clients or three hundred — same clean interface.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    border: 'group-hover:border-emerald-200 dark:group-hover:border-emerald-800/50',
  },
  {
    icon: FileSearch,
    title: 'Document Intelligence',
    description:
      'Clients upload PDFs, Word docs, or Markdown. Files are automatically parsed, chunked, embedded, and stored as a vector-searchable knowledge base.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50/80 dark:bg-amber-950/40',
    border: 'group-hover:border-amber-200 dark:group-hover:border-amber-800/50',
  },
  {
    icon: LibraryBig,
    title: 'Template Library',
    description:
      'Curate workflow templates with setup guides. Give clients a catalog of pre-built automations they can browse and request.',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50/80 dark:bg-violet-950/40',
    border: 'group-hover:border-violet-200 dark:group-hover:border-violet-800/50',
  },
  {
    icon: Shield,
    title: 'Granular Permissions',
    description:
      'Separate Manager and Client roles enforced by row-level security. Managers only see their companies. Clients only see their workflows.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50/80 dark:bg-rose-950/40',
    border: 'group-hover:border-rose-200 dark:group-hover:border-rose-800/50',
  },
  {
    icon: LayoutDashboard,
    title: 'Unified Dashboard',
    description:
      'Role-aware stats, recent chat and trigger activity, and document processing status — all scoped to what each user should see.',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50/80 dark:bg-cyan-950/40',
    border: 'group-hover:border-cyan-200 dark:group-hover:border-cyan-800/50',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="w-full py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">The solution</p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              One platform for everything between you and your clients
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {APP_NAME} replaces the duct tape with a proper system — branded, secure, and observable.
            </p>
          </div>
        </AnimatedSection>

        <div className="mx-auto max-w-6xl grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 80}>
              <div
                className={cn(
                  'group relative h-full rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/[0.03]',
                  feature.border
                )}
              >
                <div className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-lg', feature.bg)}>
                  <feature.icon className={cn('h-5 w-5', feature.color)} />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
