import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Role, Status, SubscriptionStatus } from '@/lib/constants';
import { getDashboardData } from '@/server-actions/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStatsCards } from '@/components/dashboard/dashboard-stats';
import { RecentChatTable } from '@/components/dashboard/recent-chat-table';
import { RecentTriggerTable } from '@/components/dashboard/recent-trigger-table';
import { Workflow } from 'lucide-react';
import { SubscriptionBanner } from '@/components/dashboard/subscription-banner';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session || session?.user.status !== Status.ACTIVE) {
    redirect('/auth/signin');
  }

  const t = await getTranslations('app');

  // Default date range: start of current month to now
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const data = await getDashboardData(startOfMonth.toISOString(), now.toISOString());

  const hasWorkflows = data.stats.totalWorkflows > 0;

  // Calculate trial days remaining
  const isManager = session.user.role === Role.MANAGER;
  const isTrialing = session.user.subscription_status === SubscriptionStatus.TRIALING;
  const isPastDue = session.user.subscription_status === SubscriptionStatus.PAST_DUE;

  let trialDaysLeft = 0;
  if (isTrialing && session.user.trial_ends_at) {
    trialDaysLeft = Math.max(0, Math.ceil((new Date(session.user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t('welcomeBackName', {
            name: `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim() || session.user.email,
          })}
        </h1>
      </div>

      {/* Subscription banners for managers */}
      {isManager && session.user.role !== Role.ADMIN && (
        <SubscriptionBanner
          isTrialing={isTrialing}
          isPastDue={isPastDue}
          trialDaysLeft={trialDaysLeft}
          currentTier={session.user.subscription_tier}
        />
      )}

      {!hasWorkflows ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{t('noDataYet')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardStatsCards initialStats={data.stats} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Workflow className="h-4 w-4" />
                {t('totalWorkflows')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalWorkflows}</div>
              <p className="text-xs text-muted-foreground">
                {t('activeInactiveCount', {
                  active: data.stats.activeWorkflows,
                  inactive: data.stats.inactiveWorkflows,
                })}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentChatTable sessions={data.recentChats} />
            <RecentTriggerTable triggers={data.recentTriggers} />
          </div>
        </>
      )}
    </div>
  );
}
