import LanguageSwitcher from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { Status } from '@/lib/constants';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';

export default async function SettingsPage() {
  const session = await getSession();

  if (!session || session?.user.status !== Status.ACTIVE) {
    redirect('/auth/signin');
  }
  const t = await getTranslations('app');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('selectLanguage')}:</span>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('theme')}:</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
