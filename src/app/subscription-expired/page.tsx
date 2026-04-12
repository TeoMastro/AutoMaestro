import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LogoutButton from '@/components/auth/logout-button';
import { AlertTriangle } from 'lucide-react';

export default async function SubscriptionExpiredPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/signin');
  }

  const t = await getTranslations('app');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{t('subscriptionExpiredTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t('subscriptionExpiredMessage')}</p>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
