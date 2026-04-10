import { User } from '@/types/user';

export type Company = {
  id: string;
  name: string;
  note: string | null;
  logoStoragePath: string | null;
  n8nInstanceUrl: string | null;
  n8nInstanceUsername: string | null;
  n8nInstancePassword: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CompanyFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    name: string;
    note: string;
    n8nInstanceUrl: string;
    n8nInstanceUsername: string;
    n8nInstancePassword: string;
  };
  globalError: string | null;
};

export type AssignUserToCompanyFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    user_id: string;
    company_id: string;
  };
  globalError: string | null;
};

export type GetCompaniesParams = {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetCompaniesResult = {
  companies: Company[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type CompanyTableProps = {
  companies: Company[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
};

export type CompanyFormProps = {
  company?: Omit<Company, 'createdAt' | 'updatedAt'> | null;
  mode: 'create' | 'update';
};

export type CompanyAssignment = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  assignedAt: Date;
  assignedBy: string | null;
};

export interface CompanyViewProps {
  company: Company;
  assignments: CompanyAssignment[];
  users?: Omit<User, 'password_hash'>[];
  searchParams?: { [key: string]: string | string[] | undefined };
  currentUserId?: string;
  currentUserRole?: string;
  logoUrl?: string | null;
}
