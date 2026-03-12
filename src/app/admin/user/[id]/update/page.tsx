import { notFound } from 'next/navigation';
import { UserForm } from '@/components/admin/user-form';
import { PageProps } from '@/types/user';
import { getUserById } from '@/server-actions/user';
import { getSession } from '@/lib/auth-session';
import { Role } from '@/lib/constants';

export default async function UpdateUserPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) notFound();

  const resolvedParams = await params;
  const userId = resolvedParams.id;

  if (!userId) {
    notFound();
  }

  const user = await getUserById(userId);

  if (!user) {
    notFound();
  }

  const callerRole = session.user.role as Role;

  return (
    <div className="container mx-auto py-6">
      <UserForm user={user} mode="update" callerRole={callerRole} />
    </div>
  );
}
