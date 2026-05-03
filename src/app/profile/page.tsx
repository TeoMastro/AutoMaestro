import { getSession } from '@/lib/auth-session';
import { redirect } from 'next/navigation';
import { Status, Role } from '@/lib/constants';
import { getUserCompanies } from '@/server-actions/user-company';
import { ProfileCard } from '@/components/profile/profile-card';

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

  return (
    <div>
      <ProfileCard user={session.user} companies={companies} />
    </div>
  );
}
