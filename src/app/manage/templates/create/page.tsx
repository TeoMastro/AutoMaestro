import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { Role } from '@/lib/constants';
import { TemplateLibraryForm } from '@/components/admin/template-library-form';

export default async function CreateTemplateLibraryPage() {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <TemplateLibraryForm mode="create" />
    </div>
  );
}
