export type Role =
  | "SUPER_ADMIN"
  | "HR_ADMIN"
  | "DEPT_ADMIN"
  | "APPROVER"
  | "AUDITOR"
  | "SENDER";

export type Department = { id: number; name: string; parentId?: number | null; active?: boolean };
export type Location = { id: number; name: string; active?: boolean };
export type Employee = {
  id: number;
  email: string;
  fullName: string;
  title?: string;
  whatsappNumber?: string;
  status: "ACTIVE" | "INACTIVE";
  departmentId?: number;
  locationId?: number;
  departmentName?: string;
  locationName?: string;
  externalId?: string;
};

export type AudienceRule = {
  ruleType: "DEPARTMENT" | "LOCATION" | "TITLE_CONTAINS" | "STATUS";
  ruleValue: string;
};

export type Audience = {
  id: number;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  rules?: AudienceRule[];
};

export type Campaign = {
  id: number;
  title: string;
  category: string;
  status: string;
  createdBy: string;
  scheduledAt?: string;
  smtpAccountId?: number;
  senderIdentityId?: number;
  updatedAt?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  attachmentsJson?: string | null;
};

export type Approval = {
  id: number;
  campaignId: number;
  requiredRole: Role;
  status: string;
  approverEmail?: string;
  comment?: string;
  createdAt?: string;
};

export type CampaignRecipient = {
  email: string;
  fullName?: string;
  status: string;
  lastError?: string;
};

export type SuppressionEntry = {
  id: number;
  email: string;
  reason: string;
  source?: string;
  createdAt?: string;
};

export type AuditLog = {
  id: number;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ip?: string;
  createdAt?: string;
  beforeJson?: string;
  afterJson?: string;
};

export type SmtpAccount = {
  id: number;
  name: string;
  provider: string;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  useTls: boolean;
  throttlePerMinute: number;
};

export type SenderIdentity = {
  id: number;
  displayName: string;
  email: string;
  smtpAccountId: number;
};

export type PolicySettings = {
  orgWideRule: string;
  departmentRule: string;
  maxTestRecipients: number;
  defaultThrottlePerMinute: number;
  sendWindowHours: number;
};
