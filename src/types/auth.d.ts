export type ValidationState = {
  errors: {
    email?: string[];
    password?: string[];
  };
  data: { email: string; password: string } | null;
  success: boolean;
  formData?: { email: string; password: string };
};

export type ForgotPasswordState = {
  success: boolean;
  errors: Record<string, string[]>;
  formData: { email: string };
  globalError: string | null;
  message?: string;
};
