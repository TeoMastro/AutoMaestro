import { UserForm } from '@/components/admin/user-form';
import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';

export default async function CreateUserPage() {
  const session = await getSession();
  if (!session) notFound();

  return (
    <div className="container mx-auto py-6">
      <UserForm mode="create" />
    </div>
  );
}
