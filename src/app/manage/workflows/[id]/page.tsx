import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { WorkflowView } from '@/components/admin/workflow-view';
import { getWorkflowById } from '@/server-actions/workflow';
import { getDocumentsForWorkflow } from '@/server-actions/document';
import { Role } from '@/lib/constants';
import { BreadcrumbSetter } from '@/components/layout/breadcrumb-setter';

export default async function ManageWorkflowViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    notFound();
  }

  const { id } = await params;
  const workflow = await getWorkflowById(id);

  if (!workflow) notFound();

  const documents = workflow.hasKnowledgeBase
    ? await getDocumentsForWorkflow(workflow.id)
    : [];

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbSetter segment={id} label={workflow.name} />
      <WorkflowView workflow={workflow} documents={documents} searchParams={await searchParams} />
    </div>
  );
}
