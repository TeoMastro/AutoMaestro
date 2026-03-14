import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { Role } from '@/lib/constants';
import { TemplateLibraryForm } from '@/components/admin/template-library-form';
import { getTemplateLibraryById } from '@/server-actions/template-library';
import type { TemplateLibraryPageProps } from '@/types/template-library';

export default async function UpdateTemplateLibraryPage({ params }: TemplateLibraryPageProps) {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN) {
    notFound();
  }

  const { id } = await params;
  const item = await getTemplateLibraryById(id);

  if (!item) notFound();

  return (
    <div className="container mx-auto py-6">
      <TemplateLibraryForm mode="update" item={item} />
    </div>
  );
}
