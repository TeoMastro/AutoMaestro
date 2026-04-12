import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { Status, Role } from '@/lib/constants';
import { getUserCompanies } from '@/server-actions/user-company';
import { ProfileCard } from '@/components/profile/profile-card';
import { getManagerSubscriptionForClient } from '@/lib/subscription';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session || session?.user.status !== Status.ACTIVE) {
    redirect('/auth/signin');
  }

  const { role } = session.user;
  let companies: { id: string; name: string }[] = [];

  if (role === Role.CLIENT || role === Role.MANAGER) {
    companies = await getUserCompanies();
  }

  // For clients, fetch the manager's subscription info
  let managerSubscription: {
    subscription_end_date: string | null;
    trial_ends_at: string | null;
    subscription_status: string;
    subscription_tier: string | null;
  } | null = null;

  if (role === Role.CLIENT) {
    managerSubscription = await getManagerSubscriptionForClient(session.user.id);
  }

  return (
    <div>
      <ProfileCard
        user={session.user}
        companies={companies}
        managerSubscription={managerSubscription}
      />
    </div>
  );
}
