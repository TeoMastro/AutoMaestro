import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { Role } from '@/lib/constants';
import { TemplateLibraryView } from '@/components/admin/template-library-view';
import { getTemplateLibraryById } from '@/server-actions/template-library';
import type { TemplateLibraryPageProps } from '@/types/template-library';
import { BreadcrumbSetter } from '@/components/layout/breadcrumb-setter';

export default async function ManageTemplateLibraryViewPage({ params }: TemplateLibraryPageProps) {
  const session = await getSession();

  if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER)) {
    notFound();
  }

  const { id } = await params;
  const item = await getTemplateLibraryById(id);

  if (!item) notFound();

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbSetter segment={id} label={item.title} />
      <TemplateLibraryView item={item} isAdmin={session.user.role === Role.ADMIN} />
    </div>
  );
}
