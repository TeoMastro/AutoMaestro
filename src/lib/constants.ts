// App-wide branding
export const APP_NAME = 'AutoExec';

// Replaces @prisma/client enums with plain string constants

export const WorkflowType = {
  CHAT: 'chat',
  TRIGGER: 'trigger',
} as const;

export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType];

export const DocumentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error',
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const SUPPORTED_FILE_TYPES = ['pdf', 'txt', 'docx', 'md'] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_UPLOAD_FILES = 10;

export const Role = {
  CLIENT: 'CLIENT',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const Status = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  UNVERIFIED: 'UNVERIFIED',
} as const;

export type Status = (typeof Status)[keyof typeof Status];

// Subscription

export const SubscriptionTier = {
  FREELANCER: 'freelancer',
  AGENCY: 'agency',
  SCALE: 'scale',
} as const;

export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

export const SubscriptionStatus = {
  NONE: 'none',
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const TIER_LIMITS: Record<SubscriptionTier, { companies: number; workflows: number; clients: number }> = {
  freelancer: { companies: 3, workflows: 10, clients: 10 },
  agency: { companies: 10, workflows: 50, clients: 50 },
  scale: { companies: Infinity, workflows: Infinity, clients: Infinity },
};

// During trial, users get Freelancer-tier limits
export const TRIAL_TIER = SubscriptionTier.FREELANCER;
