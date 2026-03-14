export type TemplateLibraryItem = {
  id: string;
  title: string;
  description: string | null;
  workflowJson: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateLibraryFormState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: {
    title: string;
    description: string;
    workflow_json: string;
  };
  globalError: string | null;
};

export type GetTemplateLibraryParams = {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortDirection?: string;
};

export type GetTemplateLibraryResult = {
  items: TemplateLibraryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type TemplateLibraryTableProps = {
  items: TemplateLibraryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  isAdmin: boolean;
};

export type TemplateLibraryFormProps = {
  item?: Omit<TemplateLibraryItem, 'createdAt' | 'updatedAt'> | null;
  mode: 'create' | 'update';
};

export type TemplateLibraryViewProps = {
  item: TemplateLibraryItem;
  isAdmin: boolean;
};

export type AdminTemplateLibraryPageProps = {
  searchParams: Promise<GetTemplateLibraryParams>;
};

export type TemplateLibraryPageProps = {
  params: Promise<{ id: string }>;
};
