import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { WorkflowView } from '@/components/admin/workflow-view';
import { getWorkflowById } from '@/server-actions/workflow';
import { getDocumentsForWorkflow } from '@/server-actions/document';

export default async function AdminWorkflowViewPage({ 
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();

  if (!session || session.user.role !== 'ADMIN') {
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
      <WorkflowView workflow={workflow} documents={documents} searchParams={await searchParams} />
    </div>
  );
}
