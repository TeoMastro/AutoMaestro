import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { WorkflowForm } from '@/components/admin/workflow-form';
import { getWorkflowById } from '@/server-actions/workflow';
import { getAllCompanies } from '@/server-actions/company';
import { WorkflowPageProps } from '@/types/workflow';
import { Role } from '@/lib/constants';

export default async function UpdateWorkflowPage({ params }: WorkflowPageProps) {
  const session = await getSession();

  if (!session || session.user.role !== Role.ADMIN && session.user.role !== Role.MANAGER) {
    notFound();
  }

  const { id } = await params;
  const [workflow, companies] = await Promise.all([
    getWorkflowById(id),
    getAllCompanies(),
  ]);

  if (!workflow) notFound();

  return (
    <div className="container mx-auto py-6">
      <WorkflowForm mode="update" workflow={workflow} companies={companies} />
    </div>
  );
}
