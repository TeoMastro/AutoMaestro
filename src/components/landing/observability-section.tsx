import {
  Activity,
  BarChart3,
  Clock,
  Eye,
  FileSearch,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Users,
  Zap,
} from 'lucide-react';
import { AnimatedSection } from '@/components/landing/animated-section';

const managerPoints = [
  {
    icon: Activity,
    text: 'Aggregate stats scoped to your companies — chat volume, trigger counts, active workflows',
  },
  {
    icon: Clock,
    text: 'Chronological chat and trigger logs with status badges and response previews',
  },
  {
    icon: FileText,
    text: 'Document pipeline status — pending, processing, ready, or errored — per workflow',
  },
  {
    icon: Users,
    text: 'Client roster with activity overview — who is using what, and when they last interacted',
  },
];

const clientPoints = [
  {
    icon: MessageSquare,
    text: 'Full chat history — every conversation with AI workflows, searchable and timestamped',
  },
  {
    icon: Zap,
    text: 'Trigger history — every automation run with its parameters, response, and timestamp',
  },
  {
    icon: FileSearch,
    text: 'Document tracker — see files move through parsing, chunking, and embedding stages',
  },
  {
    icon: LayoutDashboard,
    text: 'Personal dashboard with at-a-glance stats for their own workflow usage and recent activity',
  },
];

export function ObservabilitySection() {
  return (
    <section className="w-full border-y bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedSection>
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Eye className="h-3.5 w-3.5" />
              Observability
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">See everything. Miss nothing.</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Two dashboards, two perspectives — both in real time.
            </p>
          </div>
        </AnimatedSection>

        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
          {/* Manager Level */}
          <AnimatedSection delay={0}>
            <div className="h-full rounded-xl border-2 border-primary/15 bg-card p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Manager View</h3>
                  <p className="text-xs text-muted-foreground">Per-company oversight</p>
                </div>
              </div>
              <ul className="space-y-4">
                {managerPoints.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedSection>

          {/* Client Level */}
          <AnimatedSection delay={150}>
            <div className="h-full rounded-xl border-2 border-primary/15 bg-card p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40">
                  <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Client View</h3>
                  <p className="text-xs text-muted-foreground">Per-client transparency</p>
                </div>
              </div>
              <ul className="space-y-4">
                {clientPoints.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
