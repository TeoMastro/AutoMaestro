import { getSession } from '@/lib/auth-session';
import { redirect, notFound } from 'next/navigation';
import { UserView } from '@/components/admin/user-view';
import { getUserById } from '@/server-actions/user';
import { PageProps } from '@/types/user';
import { BreadcrumbSetter } from '@/components/layout/breadcrumb-setter';

export default async function ViewUserPage({ params }: PageProps) {
  const session = await getSession();

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const userId = resolvedParams.id;

  if (!userId) {
    notFound();
  }

  const user = await getUserById(userId);

  if (!user) {
    notFound();
  }

  const breadcrumbLabel = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbSetter segment={userId} label={breadcrumbLabel} />
      <UserView user={user} />
    </div>
  );
}
