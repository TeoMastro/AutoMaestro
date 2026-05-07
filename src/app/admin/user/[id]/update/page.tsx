import { notFound } from 'next/navigation';
import { UserForm } from '@/components/admin/user-form';
import { PageProps } from '@/types/user';
import { getUserById } from '@/server-actions/user';
import { getSession } from '@/lib/auth-session';
import { BreadcrumbSetter } from '@/components/layout/breadcrumb-setter';

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

  const breadcrumbLabel = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbSetter segment={userId} label={breadcrumbLabel} />
      <UserForm user={user} mode="update" />
    </div>
  );
}
